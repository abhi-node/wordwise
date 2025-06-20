import nlp from 'compromise'
import { split } from 'sentence-splitter'

// Common abbreviations that should not trigger sentence splits
const ABBREVIATIONS = new Set([
  'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'Ph.D.', 'M.D.', 'B.A.', 'M.A.', 
  'B.S.', 'M.S.', 'LL.B.', 'LL.M.', 'C.A.', 'C.P.A.', 'Ltd.', 'Inc.', 'Corp.', 'Co.',
  'St.', 'Ave.', 'Rd.', 'Blvd.', 'vs.', 'etc.', 'i.e.', 'e.g.', 'cf.', 'al.', 'et al.',
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Sept.', 'Oct.', 'Nov.', 'Dec.',
  'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.',
  'No.', 'Vol.', 'pp.', 'ed.', 'eds.', 'trans.', 'viz.', 'ca.', 'approx.',
  'U.S.', 'U.K.', 'U.N.', 'E.U.', 'N.Y.', 'L.A.', 'D.C.'
])

interface MaskedEntity {
  text: string
  replacement: string
  start: number
  end: number
  type: string
}

interface ProcessedText {
  maskedText: string
  entities: MaskedEntity[]
  originalText: string
}

interface TextChunk {
  text: string
  startOffset: number
  endOffset: number
  sentenceCount: number
}

/**
 * Masks named entities in text to prevent GPT from suggesting corrections on proper nouns
 * Returns the masked text and a map of entities for later restoration
 */
export function maskNamedEntities(text: string): ProcessedText {
  const doc = nlp(text)
  const entities: MaskedEntity[] = []
  
  // Get all named entities
  const people = doc.people().out('array') as string[]
  const places = doc.places().out('array') as string[]
  const organizations = doc.organizations().out('array') as string[]
  const dates = (doc as any).dates ? (doc as any).dates().out('array') as string[] : []
  const urls = (doc as any).urls ? (doc as any).urls().out('array') as string[] : []
  
  // Create a combined list of entities with their positions
  const allEntities = [
    ...people.map((p: string) => ({ text: p, type: 'person' })),
    ...places.map((p: string) => ({ text: p, type: 'place' })),
    ...organizations.map((o: string) => ({ text: o, type: 'organization' })),
    ...dates.map((d: string) => ({ text: d, type: 'date' })),
    ...urls.map((u: string) => ({ text: u, type: 'url' }))
  ]
  
  // Sort entities by their position in text (reverse order for replacement)
  const entityPositions = allEntities
    .map(entity => {
      const index = text.indexOf(entity.text)
      return index !== -1 ? { ...entity, start: index, end: index + entity.text.length } : null
    })
    .filter(e => e !== null)
    .sort((a, b) => b!.start - a!.start) as Array<{ text: string; type: string; start: number; end: number }>
  
  let maskedText = text
  
  // Replace entities with masks
  entityPositions.forEach((entity, idx) => {
    const mask = `<ENTITY_${entity.type.toUpperCase()}_${idx}>`
    entities.push({
      text: entity.text,
      replacement: mask,
      start: entity.start,
      end: entity.end,
      type: entity.type
    })
    
    maskedText = maskedText.slice(0, entity.start) + mask + maskedText.slice(entity.end)
  })
  
  return {
    maskedText,
    entities: entities.reverse(), // Reverse to get original order
    originalText: text
  }
}

/**
 * Restores masked entities back to their original text
 */
export function unmaskEntities(maskedText: string, entities: MaskedEntity[]): string {
  let restoredText = maskedText
  
  // Sort entities by position in reverse order to maintain indices during replacement
  const sortedEntities = [...entities].sort((a, b) => b.start - a.start)
  
  sortedEntities.forEach(entity => {
    restoredText = restoredText.replace(entity.replacement, entity.text)
  })
  
  return restoredText
}

/**
 * Adjusts error positions from masked text back to original text positions
 */
export function adjustErrorPositions(errors: any[], maskedText: string, originalText: string, entities: MaskedEntity[]): any[] {
  return errors.map(error => {
    let adjustedStart = error.start
    let adjustedEnd = error.end
    
    // Calculate offset caused by entity masking
    entities.forEach(entity => {
      const maskLength = entity.replacement.length
      const originalLength = entity.text.length
      const lengthDiff = originalLength - maskLength
      
      // Find position of mask in masked text
      const maskPos = maskedText.indexOf(entity.replacement)
      
      if (maskPos !== -1 && maskPos < error.start) {
        adjustedStart += lengthDiff
        adjustedEnd += lengthDiff
      }
    })
    
    return {
      ...error,
      start: adjustedStart,
      end: adjustedEnd
    }
  })
}

/**
 * Splits text into sentences using advanced sentence boundary detection
 * Handles abbreviations and edge cases better than simple regex
 */
export function splitIntoSentences(text: string): string[] {
  const nodes = split(text)
  
  return nodes
    .filter(node => node.type === 'Sentence')
    .map(node => node.raw.trim())
    .filter(sentence => sentence.length > 0)
}

/**
 * Creates chunks of text with specified number of sentences
 * Each chunk maintains context and avoids breaking at inappropriate points
 */
export function createTextChunks(text: string, sentencesPerChunk: number = 3): TextChunk[] {
  const sentences = splitIntoSentences(text)
  const chunks: TextChunk[] = []
  
  if (sentences.length === 0) return chunks
  
  // Instead of joining sentences with spaces, find their actual positions in the original text
  let searchStart = 0
  
  for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
    const chunkSentences = sentences.slice(i, i + sentencesPerChunk)
    
    // Find the start of the first sentence in this chunk
    const firstSentence = chunkSentences[0]
    const startOffset = text.indexOf(firstSentence, searchStart)
    
    if (startOffset === -1) continue // Skip if sentence not found
    
    // Find the end of the last sentence in this chunk
    const lastSentence = chunkSentences[chunkSentences.length - 1]
    const lastSentenceStart = text.indexOf(lastSentence, startOffset)
    const endOffset = lastSentenceStart + lastSentence.length
    
    // Extract the exact chunk text from the original, preserving all spacing
    const chunkText = text.slice(startOffset, endOffset)
    
    chunks.push({
      text: chunkText,
      startOffset,
      endOffset,
      sentenceCount: chunkSentences.length
    })
    
    searchStart = endOffset
  }
  
  return chunks
}

/**
 * Main function to process text for grammar checking
 * Combines NER masking with intelligent chunking
 */
export function prepareTextForGrammarCheck(text: string, sentencesPerChunk: number = 3): {
  chunks: Array<{
    maskedText: string
    originalText: string
    entities: MaskedEntity[]
    startOffset: number
    endOffset: number
  }>
} {
  // First, create chunks of the original text
  const textChunks = createTextChunks(text, sentencesPerChunk)
  
  // Then mask entities in each chunk
  const processedChunks = textChunks.map(chunk => {
    const { maskedText, entities, originalText } = maskNamedEntities(chunk.text)
    
    return {
      maskedText,
      originalText,
      entities,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset
    }
  })
  
  return { chunks: processedChunks }
} 