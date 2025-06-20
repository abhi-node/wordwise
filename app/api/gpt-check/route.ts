import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Ensure the OPENAI_API_KEY env variable is set
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Grammar checker cannot run.')
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Max characters sent per single GPT request. Documents longer than this
// threshold will be split into multiple chunks so the model can still use
// enough surrounding context without exceeding token limits. You can
// overwrite via the GPT_CHECK_CHUNK_SIZE env variable.
// Default increased from 8k to 16k characters to give GPT substantially more
// surrounding context for punctuation and grammar decisions.
const MAX_CHUNK_CHARS = parseInt(process.env.GPT_CHECK_CHUNK_SIZE || '16000', 10)

// Number of sentences to feed per GPT call. Can be overridden via env.
const SENTENCES_PER_CHUNK = parseInt(process.env.GPT_CHECK_SENTENCES_PER_CHUNK || '5', 10)

// ------------------------------------------------------------
// Simple helper that splits text into sentence-level chunks.
// We use a conservative regex to capture common sentence delimiters (.!?).
// Each returned chunk contains up to `sentencesPerChunk` sentences joined
// together, trimmed, and ready to send to GPT.
// ------------------------------------------------------------
const splitIntoSentenceChunks = (
  fullText: string,
  sentencesPerChunk: number,
): string[] => {
  // Include trailing quotes or brackets immediately after sentence punctuation so they
  // remain with the sentence instead of being treated as the start of the next one.
  const sentenceRegex = /[^.!?\n]+[.!?]+["'")}\]]*\s*|[^.!?\n]+$/g
  const sentences = fullText.match(sentenceRegex) || []

  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
    const group = sentences.slice(i, i + sentencesPerChunk).join(' ').trim()
    if (group.length > 0) chunks.push(group)
  }
  return chunks
}

// ---------------------------------------------------------------------------
// Prompt engineering tweaks (2025-06-17)
// ---------------------------------------------------------------------------
// Added explicit guidance on *how* punctuation insertions must be represented
// after observing GPT occasionally suggesting misplaced commas such as
// "Hey is, this …".
//
// Key changes:
//  • For punctuation INSERTIONS the assistant must include at least one
//    neighbouring word in `original_text` so the substring is non-empty and
//    unambiguous (e.g. original_text: "Hey", suggested_replacement: "Hey,").
//  • Re-emphasise that the tool must avoid stylistic rewrites and focus on
//    *correct* standard English grammar.
//  • Provide a concrete example highlighting the expected behaviour.
//  • NEW (2025-06-18): For punctuation and grammar issues the assistant must
//    return a *full phrase* or clause rewrite in `suggested_replacement`, not a
//    minimal token-level diff. The corresponding `original_text` must therefore
//    include that same full phrase as it appears in the user input. This helps
//    reduce false positives on longer passages while preserving context.
//  • UPDATE (2025-06-18): The assistant must flag ONLY undeniable errors — do
//    NOT suggest changes that are stylistic, optional, or merely improve
//    clarity. If multiple variants are acceptable under standard English,
//    leave the text untouched.
// ---------------------------------------------------------------------------

const systemPrompt = `You are an expert proofreader whose sole job is to surface **only undeniable grammatical or spelling errors**. If a sentence can reasonably be interpreted as correct under modern standard English, you MUST leave it untouched.

Return the 4-6 word span that contains the error together with a full-phrase rewrite that fixes it while preserving meaning. Also provide a brief explanation (5-8 words) of why the change is needed.

When you do flag an error, respond **only** with valid JSON matching this exact schema (no markdown, no extra keys):
{
  "corrections": [
    {
      "category": "spelling" | "grammar",
      "start_index": <integer>,
      "end_index": <integer>,
      "original_text": "<the exact phrase>",
      "suggested_replacement": "<corrected phrase>",
      "explanation": "<5-8 word explanation>"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // short-circuit for tiny inputs
    if (text.trim().length < 5) {
      return NextResponse.json([])
    }

    // Use a configurable model, defaulting to GPT-4 level. We'll gracefully
    // fall back to 3.5-turbo with function-calling if the preferred model is
    // unavailable for the given API key.
    const preferredModel = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    // Build a chat completion request that uses the modern `tools` / `tool_choice`
    // function-calling format. This is compatible with the latest OpenAI models
    // (including GPT-4o) while still working with older ones.
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
          content: `You will receive some text delimited with triple quotes.\n\nAnalyse the passage in-depth and identify ALL *errors* related to grammar and spelling (including real-word errors). Flag an item ONLY if it is unequivocally incorrect according to modern standard English **and** you are at least 95% certain it is wrong. If multiple variants are acceptable, leave it untouched.\nReturn ONLY the JSON described above via the \`grammar_corrections\` function.\nMaintain the exact order of appearance.\nDo NOT include stylistic or preferential rewrites or clarity edits.\nFor grammar issues, your suggested_replacement must present a full phrase rewrite that fixes the error while preserving meaning.\n\nHere is the text:\n\n"""${inputText}"""`,
        },
      ],
      tools: [
        {
          type: 'function',
          "function": {
            name: 'grammar_corrections',
            description:
              'Lists spelling and grammar corrections in the input text',
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
    // Helper that extracts context words before and after an error
    // ------------------------------------------------------------
    const extractContext = (text: string, start: number, end: number): { before: string, after: string } => {
      // Extract 3-4 words before the error
      const beforeText = text.substring(0, start).trim()
      const beforeWords = beforeText.split(/\s+/)
      const contextBefore = beforeWords.slice(-4).join(' ')
      
      // Extract 3-4 words after the error
      const afterText = text.substring(end).trim()
      const afterWords = afterText.split(/\s+/)
      const contextAfter = afterWords.slice(0, 4).join(' ')
      
      return { before: contextBefore, after: contextAfter }
    }

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
    // Break the document into ≤5-sentence chunks first.
    // Each chunk is sent independently to GPT so that the
    // context window stays tight, reducing false positives.
    // --------------------------------------------------
    const edits: any[] = []

    const sentenceChunks = splitIntoSentenceChunks(text, SENTENCES_PER_CHUNK)

    for (const chunk of sentenceChunks) {
      // Safety guard: if for some reason a 5-sentence chunk still exceeds
      // the character threshold (e.g. very long legal clauses), fall back
      // to fixed-width slicing inside that chunk.
      if (chunk.length > MAX_CHUNK_CHARS) {
        for (let i = 0; i < chunk.length; i += MAX_CHUNK_CHARS) {
          const slice = chunk.slice(i, i + MAX_CHUNK_CHARS)
          if (slice.trim().length === 0) continue
          try {
            const subEdits = await runGptCheck(slice)
            edits.push(...subEdits)
          } catch (e) {
            console.error('GPT check failed for sub-chunk starting at', i, e)
          }
        }
      } else {
        try {
          const chunkEdits = await runGptCheck(chunk)
          edits.push(...chunkEdits)
        } catch (e) {
          console.error('GPT check failed for sentence chunk', e)
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
        startIdx = text.indexOf(edit.original, searchCursor)

        // If not found after the cursor, try from the very beginning (edge-case fallback)
        if (startIdx === -1) {
          startIdx = text.indexOf(edit.original)
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
          edit.end <= text.length
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
      const context = extractContext(text, startIdx, endIdx)

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
      uniqueMap.set(`${e.start}-${e.end}-${e.suggestion}`, e)
    })

    const errors = Array.from(uniqueMap.values()).sort((a, b) => (a.start as number) - (b.start as number))

    return NextResponse.json(errors)
  } catch (error) {
    console.error('GPT-checker route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 