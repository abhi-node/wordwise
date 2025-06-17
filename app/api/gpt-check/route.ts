import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Ensure the OPENAI_API_KEY env variable is set
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Define the JSON schema that GPT will return so we can ask for structured data
const systemPrompt = `You are an expert proof-reader. For any input text you will detect spelling, grammar and punctuation mistakes.
Return ONLY valid JSON with the following schema:
{
  "errors": [
    {
      "type": "spelling" | "grammar" | "punctuation",
      "start": <number>,   // inclusive character index in original string
      "end": <number>,     // exclusive character index
      "word": <string>,    // substring that is wrong
      "suggestion": <string>
    }, ...
  ]
}
Do not wrap the JSON in markdown.
Limit to max 25 errors.`

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

    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a grammar, punctuation and spelling assistant. Return only valid JSON via the specified function.'
        },
        {
          role: 'user',
          content: `You will receive some text delimited with triple quotes.\n\nFor every grammar/spelling/punctuation mistake you detect:\n - Provide the ORIGINAL substring that is wrong ("original").\n - Provide a SUGGESTION to replace it ("suggestion").\n - Provide the inclusive START and exclusive END character indices relative to the ORIGINAL text (first character is index 0).\n\nReturn this information via the \`grammar_suggestions\` function call ONLY.\nMaintain the same order the mistakes appear in the text.\nAvoid suggestions that only change stylistic preference.\n\nHere is the text:\n\n"""${text}"""`
        }
      ],
      functions: [
        {
          name: 'grammar_suggestions',
          description: 'Produces corrected text and a list of edits',
          parameters: {
            type: 'object',
            properties: {
              corrected_text: { type: 'string', description: 'Full corrected text.' },
              edits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    suggestion: { type: 'string' },
                    start: { type: 'integer' },
                    end: { type: 'integer' },
                    type: {
                      type: 'string',
                      enum: ['spelling', 'grammar', 'punctuation']
                    }
                  },
                  required: ['original', 'suggestion', 'start', 'end', 'type']
                }
              }
            },
            required: ['corrected_text', 'edits']
          }
        }
      ],
      function_call: { name: 'grammar_suggestions' }
    })

    const fnCall = completion.choices?.[0]?.message?.function_call

    if (!fnCall?.arguments) {
      console.error('No function call arguments from GPT', fnCall)
      return NextResponse.json([])
    }

    let parsed
    try {
      parsed = JSON.parse(fnCall.arguments as string)
    } catch (e) {
      console.error('Failed to parse function call args', fnCall.arguments)
      return NextResponse.json([])
    }

    const edits = Array.isArray(parsed?.edits) ? parsed.edits : []

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

      // If still not located we simply skip this suggestion because we cannot safely map it.
      if (startIdx === -1) {
        return null
      }

      const endIdx = startIdx + edit.original.length
      // Advance the search cursor so duplicate words later in the text can be matched properly
      searchCursor = endIdx

      return {
        type: edit.type,
        word: edit.original,
        start: startIdx,
        end: endIdx,
        suggestion: edit.suggestion,
        context: undefined,
      }
    }).filter(Boolean) // remove nulls if any edits could not be mapped

    const errors = (errorsUnsorted as any[]).sort((a, b) => (a.start as number) - (b.start as number))

    return NextResponse.json(errors)
  } catch (error) {
    console.error('GPT-checker route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 