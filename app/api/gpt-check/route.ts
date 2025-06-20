import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prepareTextForGrammarCheck, adjustErrorPositions } from '@/lib/textProcessing'

// Ensure the OPENAI_API_KEY env variable is set
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Grammar checker cannot run.')
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Max characters sent per single GPT request. Documents longer than this
// threshold will be split into multiple chunks so the model can still use
// enough surrounding context without exceeding token limits. You can
// overwrite via the GPT_CHECK_CHUNK_SIZE env variable.
// Reduced to 2000 characters to ensure focused error detection in smaller chunks
const MAX_CHUNK_CHARS = parseInt(process.env.GPT_CHECK_CHUNK_SIZE || '2000', 10)

// Number of sentences to feed per GPT call. Can be overridden via env.
// Set to 2 sentences for optimal error detection with sufficient context
const SENTENCES_PER_CHUNK = parseInt(process.env.GPT_CHECK_SENTENCES_PER_CHUNK || '2', 10)

// Note: Sentence chunking is handled by prepareTextForGrammarCheck from textProcessing library
// which uses advanced sentence boundary detection for better accuracy

// ---------------------------------------------------------------------------
// Prompt engineering tweaks (2025-06-17, updated 2025-01)
// ---------------------------------------------------------------------------
// Simplified the prompt to better catch grammar and punctuation errors while
// still avoiding purely stylistic changes.
//
// Key changes:
//  • Removed overly conservative language that was causing real errors to be missed
//  • Added explicit focus on question mark vs period errors (e.g., "Can you help me." → "Can you help me?")
//  • Clarified that punctuation errors are real errors that should be flagged
//  • Maintained guidance to avoid stylistic preferences and optional changes
//  • For punctuation and grammar issues the assistant must return a *full phrase* 
//    or clause rewrite in `suggested_replacement`, not a minimal token-level diff
// ---------------------------------------------------------------------------

const systemPrompt = `You are a proofreader who identifies clear grammatical and punctuation errors with the specified context.

IMPORTANT: The text may contain masked entities like <ENTITY_PERSON_0>, <ENTITY_PLACE_1>, etc. These are placeholders and should be treated as correct.

Flag these types of errors:
- Spelling mistakes: "grammer" → "grammar"
- Wrong verb forms: "He go" → "He goes"  
- Incorrect punctuation: "Can you help me." → "Can you help me?"
- Questions must end with "?" not "."
- Statements should not end with "?"
- Missing apostrophes: "dont" → "don't"
- Duplicate words: "the the" → "the"

Do NOT flag:
- Style preferences (both "Check the system" and "Check system" are fine)
- Optional commas
- British vs American spelling
- Adding articles (a/an/the) unless grammatically required

Return ONLY corrections for actual errors. For each error, include a 4-6 word span containing the mistake.

Respond with valid JSON:
{
  "corrections": [
    {
      "category": "spelling" | "grammar",
      "start_index": <integer>,
      "end_index": <integer>,
      "original_text": "<exact error text>",
      "suggested_replacement": "<minimal correction>",
      "explanation": "<brief explanation>"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) {
      return NextResponse.json([])
    }

    // Trim to 64K max – just a safety net for cost and timeout reasons
    const truncatedText = text.length > 65536 ? text.slice(0, 65536) : text

    // Helper function for extracting context around an error
    const extractContext = (fullText: string, startIdx: number, endIdx: number) => {
      const contextChars = 20
      const before = fullText.slice(Math.max(0, startIdx - contextChars), startIdx)
      const after = fullText.slice(endIdx, Math.min(fullText.length, endIdx + contextChars))
      return { before, after }
    }

    // Check for preferred model availability
    const preferredModel = process.env.GPT_MODEL_NAME || 'gpt-4o-mini'

    // Build the GPT request payload
    const buildRequest = (modelName: string, inputText: string): any => ({
      model: modelName,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Check this text for grammatical and punctuation errors.

Text to check:
"""${inputText}"""

Focus on:
- Questions ending with periods instead of question marks
- Spelling mistakes
- Wrong verb forms
- Missing or incorrect punctuation
- Missing apostrophes in contractions

Return ONLY the JSON via the grammar_corrections function.`,
        },
      ],
      tools: [
        {
          type: 'function',
          "function": {
            name: 'grammar_corrections',
            description:
              'Lists only clear spelling and grammar errors in the input text',
            parameters: {
              type: 'object',
              properties: {
                corrections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: {
                        type: 'string',
                        enum: ['spelling', 'grammar'],
                      },
                      start_index: { type: 'integer' },
                      end_index: { type: 'integer' },
                      original_text: { type: 'string' },
                      suggested_replacement: { type: 'string' },
                      explanation: { type: 'string' },
                    },
                    required: [
                      'category',
                      'start_index',
                      'end_index',
                      'original_text',
                      'suggested_replacement',
                      'explanation',
                    ],
                  },
                },
              },
              required: ['corrections'],
            },
          },
        },
      ],
      // Explicitly force the model to call our single defined function
      tool_choice: {
        type: 'function',
        "function": { name: 'grammar_corrections' },
      },
    })

    // ------------------------------------------------------------
    // Helper that performs a single GPT request with graceful fallbacks
    // ------------------------------------------------------------
    const runGptCheck = async (input: string): Promise<any[]> => {
      let completion
      try {
        completion = await openai.chat.completions.create(buildRequest(preferredModel, input) as any)
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || String(err)
        console.warn(`GPT grammar checker failed with model "${preferredModel}": ${msg}`)

        // Retry with 3.5-turbo if this looks like an availability / access issue.
        const shouldRetry = msg.includes('model') || msg.includes('availability') || msg.includes('not found')
        if (!shouldRetry) throw err

        const fallbackModel = 'gpt-3.5-turbo-1106'
        completion = await openai.chat.completions.create(buildRequest(fallbackModel, input) as any)
        console.info(`GPT grammar checker succeeded with fallback model "${fallbackModel}"`)
      }

      // ----------------------------------------------
      // Extract the tool / function arguments. Newer models return
      // `tool_calls`, while older ones use `function_call`.
      // ----------------------------------------------
      const choiceMsg: any = completion.choices?.[0]?.message

      let argsStr: string | undefined

      if (choiceMsg?.tool_calls?.[0]?.function?.arguments) {
        // New format
        argsStr = choiceMsg.tool_calls[0].function.arguments as string
      } else if (choiceMsg?.function_call?.arguments) {
        // Legacy format
        argsStr = choiceMsg.function_call.arguments as string
      }

      if (!argsStr) {
        console.error('No function/tool call arguments from GPT', choiceMsg)
        return []
      }

      let parsed
      try {
        parsed = JSON.parse(argsStr)
      } catch (e) {
        console.error('Failed to parse function/tool call args', argsStr)
        return []
      }

      // Map the new corrections schema to the legacy "edit" shape expected downstream
      if (!Array.isArray(parsed?.corrections)) return []

      return parsed.corrections.map((c: any) => ({
        original: c.original_text,
        suggestion: c.suggested_replacement,
        start: c.start_index,
        end: c.end_index,
        type: c.category,
        explanation: c.explanation || ''
      }))
    }

    // --------------------------------------------------
    // Use the new text processing pipeline
    // --------------------------------------------------
    const edits: any[] = []
    
    // Prepare text with NER masking and intelligent chunking
    const { chunks } = prepareTextForGrammarCheck(truncatedText, SENTENCES_PER_CHUNK)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Grammar check: Processing ${chunks.length} chunks of ${SENTENCES_PER_CHUNK} sentences each`)
    }
    
    for (const chunk of chunks) {
      // Safety guard: if chunk still exceeds character limit
      if (chunk.maskedText.length > MAX_CHUNK_CHARS) {
        console.warn(`Chunk exceeds ${MAX_CHUNK_CHARS} chars (${chunk.maskedText.length} chars). Consider adjusting SENTENCES_PER_CHUNK.`)
        
        // For oversized chunks, process only the first MAX_CHUNK_CHARS characters
        // This ensures we don't break sentences mid-way
        const truncatedChunk = chunk.maskedText.substring(0, MAX_CHUNK_CHARS)
        
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Processing truncated chunk: "${truncatedChunk.substring(0, 50)}..."`)
          }
          
          const chunkEdits = await runGptCheck(truncatedChunk)
          // Adjust positions back to original text and account for chunk offset
          const adjustedEdits = adjustErrorPositions(chunkEdits, truncatedChunk, chunk.originalText.substring(0, MAX_CHUNK_CHARS), chunk.entities)
            .map(edit => ({
              ...edit,
              start: edit.start + chunk.startOffset,
              end: edit.end + chunk.startOffset
            }))
          edits.push(...adjustedEdits)
        } catch (e) {
          console.error('GPT check failed for truncated chunk', e)
        }
      } else {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Processing chunk (${chunk.maskedText.length} chars): "${chunk.maskedText.substring(0, 50)}..."`)
          }
          
          const chunkEdits = await runGptCheck(chunk.maskedText)
          // Adjust positions back to original text and account for chunk offset
          const adjustedEdits = adjustErrorPositions(chunkEdits, chunk.maskedText, chunk.originalText, chunk.entities)
            .map(edit => ({
              ...edit,
              start: edit.start + chunk.startOffset,
              end: edit.end + chunk.startOffset
            }))
          edits.push(...adjustedEdits)
        } catch (e) {
          console.error('GPT check failed for chunk', e)
        }
      }
    }

    // Recompute reliable start/end indices by scanning the original text sequentially.
    // GPT occasionally returns incorrect offsets. We therefore ignore the indexes coming back
    // from the model and instead find each occurrence of the `original` string inside the
    // user-supplied `text` while making sure we move a cursor forward so that duplicate
    // occurrences map correctly to later matches in the document.
    let searchCursor = 0
    const errorsUnsorted = edits.map((edit: any) => {
      let startIdx = -1

      // Attempt to locate the original substring at or after the current cursor.
      if (typeof edit.original === 'string' && edit.original.length > 0) {
        startIdx = truncatedText.indexOf(edit.original, searchCursor)

        // If not found after the cursor, try from the very beginning (edge-case fallback)
        if (startIdx === -1) {
          startIdx = truncatedText.indexOf(edit.original)
        }
      }

      let endIdx = -1

      if (startIdx !== -1) {
        endIdx = startIdx + edit.original.length
        // Advance the search cursor so duplicate words later in the text can be matched properly
        searchCursor = endIdx
      } else {
        // As a fallback, trust GPT's indices if they look sane.
        if (
          typeof edit.start === 'number' &&
          typeof edit.end === 'number' &&
          edit.start >= 0 &&
          edit.end > edit.start &&
          edit.end <= truncatedText.length
        ) {
          startIdx = edit.start
          endIdx = edit.end
        } else {
          // Still could not map – include as best-effort to avoid silent loss.
          // Map to 0-length selection at cursor to at least display suggestion.
          startIdx = searchCursor
          endIdx = searchCursor
        }
      }

      // Normalise edit type to one of the supported categories.
      let mappedType: 'spelling' | 'grammar' = 'grammar'
      const rawType = (edit.type || '').toString().toLowerCase()
      if (rawType.includes('spell')) mappedType = 'spelling'
      // Treat any other categories (including legacy "punctuation") as grammar

      // Extract context around the error
      const context = extractContext(truncatedText, startIdx, endIdx)

      return {
        type: mappedType,
        word: edit.original,
        start: startIdx,
        end: endIdx,
        suggestion: edit.suggestion,
        context: undefined,
        explanation: edit.explanation || '',
        contextBefore: context.before,
        contextAfter: context.after,
      }
    })

    // Deduplicate identical suggestions that may appear due to chunk overlap or
    // repeated words across chunks.
    const uniqueMap = new Map<string, any>()
    errorsUnsorted.forEach((e: any) => {
      // Use a more specific key that includes the error type and suggestion
      const key = `${e.start}-${e.end}-${e.type}-${e.word}-${e.suggestion}`
      
      // Check if we already have an error at this position
      const existing = uniqueMap.get(key)
      if (existing) {
        // Keep the one with more context/explanation
        if (!existing.explanation && e.explanation) {
          uniqueMap.set(key, e)
        }
      } else {
        // Also check for overlapping errors
        let isOverlapping = false
        for (const [, existingError] of uniqueMap) {
          // Check if this error overlaps with an existing one
          if (
            (e.start >= existingError.start && e.start < existingError.end) ||
            (e.end > existingError.start && e.end <= existingError.end) ||
            (e.start <= existingError.start && e.end >= existingError.end)
          ) {
            // If they suggest the same fix at overlapping positions, skip this one
            if (e.suggestion === existingError.suggestion) {
              isOverlapping = true
              break
            }
            // If they suggest different fixes, keep the longer span (more context)
            if (e.end - e.start > existingError.end - existingError.start) {
              uniqueMap.delete(`${existingError.start}-${existingError.end}-${existingError.type}-${existingError.word}-${existingError.suggestion}`)
            } else {
              isOverlapping = true
              break
            }
          }
        }
        
        if (!isOverlapping) {
          uniqueMap.set(key, e)
        }
      }
    })

    const errors = Array.from(uniqueMap.values()).sort((a, b) => (a.start as number) - (b.start as number))

    // Filter out any errors where the suggestion is the same as the original text
    const filteredErrors = errors.filter(error => {
      const original = (error.word || '').trim()
      const suggestion = (error.suggestion || '').trim()
      return original !== suggestion && original.toLowerCase() !== suggestion.toLowerCase()
    })

    return NextResponse.json(filteredErrors)
  } catch (error) {
    console.error('GPT-checker route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 