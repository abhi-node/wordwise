import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Ensure the OPENAI_API_KEY env variable is present
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. GPT spell-checker cannot run.')
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/gpt-spell
 * Accepts: { text: string }
 * Returns: TextError[] containing ONLY spelling mistakes for the snippet.
 * This endpoint is optimised for very small inputs (the last 1–2 words),
 * so we do NOT chunk or do any heavy processing.
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Short-circuit for empty / whitespace-only inputs
    if (text.trim().length === 0) {
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
            'You are an expert English spelling assistant. Return only valid JSON via the specified function.'
        },
        {
          role: 'user',
          content: `Detect if any spelling mistakes exist in the following quoted snippet. The text may contain up to two words. If there is a spelling error, provide it via a function call. Otherwise return an empty errors array. Maintain correct indices relative to the provided snippet. Do NOT include grammar or punctuation issues. Only genuine spelling mistakes.\n\n"""${text}"""`
        }
      ],
      functions: [
        {
          name: 'spelling_suggestions',
          description: 'Return detected spelling mistakes',
          parameters: {
            type: 'object',
            properties: {
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    suggestion: { type: 'string' },
                    start: { type: 'integer' },
                    end: { type: 'integer' }
                  },
                  required: ['original', 'suggestion', 'start', 'end']
                }
              }
            },
            required: ['errors']
          }
        }
      ],
      function_call: { name: 'spelling_suggestions' }
    })

    const fnCall = completion.choices?.[0]?.message?.function_call
    if (!fnCall?.arguments) {
      console.error('No function call args from GPT-spell', fnCall)
      return NextResponse.json([])
    }

    let parsed
    try {
      parsed = JSON.parse(fnCall.arguments as string)
    } catch (err) {
      console.error('Failed to parse GPT-spell function args', err)
      return NextResponse.json([])
    }

    const edits = Array.isArray(parsed?.errors) ? parsed.errors : []

    // Map into TextError format expected by the front-end
    const errors = edits.map((edit: any) => ({
      type: 'spelling' as const,
      word: edit.original,
      start: edit.start,
      end: edit.end,
      suggestion: edit.suggestion,
      context: undefined,
    }))

    return NextResponse.json(errors)
  } catch (error) {
    console.error('GPT-spell route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 