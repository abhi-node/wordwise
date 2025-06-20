export interface TextError {
  type: "spelling" | "grammar" | "style"
  word: string
  start: number
  end: number
  suggestion?: string
  context?: string
  from?: number
  to?: number
  source?: 'lt' | 'gpt'
  occurrence?: number
  explanation?: string
  contextBefore?: string
  contextAfter?: string
}

// Helper to convert char index to ProseMirror position
export function posFromCharIndex(doc: any, index: number): number {
  if (index <= 0) return 1
  // Fast path – if index is beyond document text length, return end
  const totalTextLength = doc.textBetween(0, doc.content.size, "\n").length
  if (index >= totalTextLength) return doc.content.size
  let lo = 0
  let hi = doc.content.size
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const len = doc.textBetween(0, mid, "\n").length
    if (len < index) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return Math.max(1, lo)
}

// Get plain text representation that matches what editor.getText() returns
export function getPlainTextFromDoc(doc: any): string {
  let text = ''
  let isFirstBlock = true
  doc.descendants((node: any) => {
    if (node.isText) {
      text += node.text || ''
    } else if (node.isBlock && node.type.name !== 'doc') {
      if (!isFirstBlock && text.length > 0) {
        text += '\n'
      }
      isFirstBlock = false
    }
    return true
  })
  return text
}

interface SearchMatch {
  from: number
  to: number
}

// Enhanced function to find text in ProseMirror doc more reliably
export function findTextInDoc(
  doc: any,
  searchText: string,
  startOffset: number = 0,
  originalStart?: number
): SearchMatch | null {
  const docText = getPlainTextFromDoc(doc)

  if (originalStart !== undefined) {
    const window = Math.min(50, searchText.length * 2)
    const searchStart = Math.max(0, originalStart - window)
    const searchEnd = Math.min(docText.length, originalStart + searchText.length + window)
    const nearbyText = docText.substring(searchStart, searchEnd)
    const relativeIndex = nearbyText.indexOf(searchText)
    if (relativeIndex !== -1) {
      const actualIndex = searchStart + relativeIndex
      return {
        from: posFromCharIndex(doc, actualIndex),
        to: posFromCharIndex(doc, actualIndex + searchText.length),
      }
    }
  }

  const index = docText.indexOf(searchText, startOffset)
  if (index === -1) return null
  return {
    from: posFromCharIndex(doc, index),
    to: posFromCharIndex(doc, index + searchText.length),
  }
}

// Map error character indices to ProseMirror positions for precise replacements
export function mapCharacterPositions(doc: any, fullText: string, errs: TextError[]): TextError[] {
  // Helper to compute the *n*th occurrence index for a given substring up to a given char index
  const getOccurrenceIndex = (substr: string, upto: number): number => {
    if (!substr) return 0
    let occ = 0
    let pos = fullText.indexOf(substr)
    while (pos !== -1 && pos < upto) {
      occ++
      pos = fullText.indexOf(substr, pos + substr.length)
    }
    return occ
  }

  return errs.map((err) => {
    const flaggedText = fullText.slice(err.start, err.end)
    let match = findTextInDoc(doc, flaggedText, 0, err.start)
    let from: number | undefined = match?.from
    let to: number | undefined = match?.to
    if ((from === undefined || to === undefined) && err.word) {
      match = findTextInDoc(doc, err.word, 0, err.start)
      from = match?.from
      to = match?.to
    }
    if (from === undefined || to === undefined) {
      from = posFromCharIndex(doc, err.start)
      to = posFromCharIndex(doc, err.end)
    }

    // Determine occurrence index for later re-mapping. We compute it based on the *original* positions.
    const occurrence = err.word ? getOccurrenceIndex(err.word, err.start) : undefined

    return { ...err, from, to, occurrence }
  })
} 