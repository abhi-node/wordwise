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
// ---------------------------------------------------------------------------

const systemPrompt = `You are an expert proofreader and copy editor with deep mastery of English grammar, style, and punctuation. For any user-provided text, detect and classify issues — including spelling mistakes, grammatical errors, and punctuation misuses — and suggest precise, *standard-English* fixes (no stylistic re-writes).

IMPORTANT PUNCTUATION GUIDELINES:
1. When ADDING punctuation that is missing (e.g. a comma after an introductory interjection), never return an empty string for "original_text". Instead, include the nearest word or token *plus* the punctuation in "suggested_replacement". Example:
   • Input snippet:  "Hey is this going to work?"
   • Correct output item:
     {
       "category": "punctuation",
       "start_index": 0,
       "end_index": 3,
       "original_text": "Hey",
       "suggested_replacement": "Hey,"
     }
   (❌ Wrong: inserting a comma after the verb "is").
2. Ensure all suggested punctuation placements follow conventional grammar rules for modern written English.

You must output ONLY a single JSON object exactly matching this schema (no markdown, no commentary, no field omissions):
{
  "corrections": [
    {
      "category": "spelling" | "grammar" | "punctuation",
      "start_index": <integer>,           // inclusive character index in original text
      "end_index": <integer>,             // exclusive character index
      "original_text": <string>,          // the exact substring containing the issue (non-empty!)
      "suggested_replacement": <string>,  // the corrected text
    },
    … up to 25 items total …
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
          content: `You will receive some text delimited with triple quotes.\n\nAnalyse the passage in-depth and identify ALL mistakes related to grammar, punctuation and spelling, including real-word errors.\nReturn ONLY the JSON described above via the \`grammar_corrections\` function.\nMaintain the exact order of appearance.\nDo NOT include stylistic or preferential rewrites.\n\nHere is the text:\n\n"""${inputText}"""`,
        },
      ],
      tools: [
        {
          type: 'function',
          "function": {
            name: 'grammar_corrections',
            description:
              'Lists spelling, grammar and punctuation corrections in the input text',
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
                        enum: ['spelling', 'grammar', 'punctuation'],
                      },
                      start_index: { type: 'integer' },
                      end_index: { type: 'integer' },
                      original_text: { type: 'string' },
                      suggested_replacement: { type: 'string' },
                    },
                    required: [
                      'category',
                      'start_index',
                      'end_index',
                      'original_text',
                      'suggested_replacement',
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
        type: c.category
      }))
    }

    // --------------------------------------
    // Handle potential chunking for long text
    // --------------------------------------
    const edits: any[] = []

    if (text.length <= MAX_CHUNK_CHARS) {
      // Single request is sufficient
      edits.push(...(await runGptCheck(text)))
    } else {
      // Break the document into reasonably sized chunks. We choose simple
      // fixed-width slices to keep the implementation robust. Each chunk is
      // analysed independently, and the suggestions are merged afterwards.
      for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
        const slice = text.slice(i, i + MAX_CHUNK_CHARS)
        if (slice.trim().length === 0) continue
        try {
          const chunkEdits = await runGptCheck(slice)
          edits.push(...chunkEdits)
        } catch (e) {
          console.error('GPT check failed for chunk starting at', i, e)
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
      let mappedType: 'spelling' | 'grammar' | 'punctuation' = 'grammar'
      const rawType = (edit.type || '').toString().toLowerCase()
      if (rawType.includes('spell')) mappedType = 'spelling'
      else if (rawType.includes('punct')) mappedType = 'punctuation'

      return {
        type: mappedType,
        word: edit.original,
        start: startIdx,
        end: endIdx,
        suggestion: edit.suggestion,
        context: undefined,
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