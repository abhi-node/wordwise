import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text, tone } = await req.json()

    if (!text || typeof text !== 'string' || !tone) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are an expert writing assistant. The user wants to rewrite text to have a ${tone} tone while keeping meaning intact.`,
        },
        {
          role: 'user',
          content: `Provide a SINGLE best suggestion to adjust the following text to a ${tone} tone without altering its meaning. Return ONLY via function call. For this one suggestion include: original substring, suggestion substring, start index (inclusive), end index (exclusive). Maintain order & correct indices.\n\n"""${text}"""`,
        },
      ],
      functions: [
        {
          name: 'tone_suggestions',
          description: 'Suggestions to adjust text tone',
          parameters: {
            type: 'object',
            properties: {
              edits: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    suggestion: { type: 'string' },
                    start: { type: 'integer' },
                    end: { type: 'integer' },
                  },
                  required: ['original', 'suggestion', 'start', 'end'],
                },
              },
            },
            required: ['edits'],
          },
        },
      ],
      function_call: { name: 'tone_suggestions' },
    })

    const fnCall = completion.choices?.[0]?.message?.function_call
    if (!fnCall?.arguments) {
      console.error('No function call from GPT tone')
      return NextResponse.json([])
    }
    let parsed
    try {
      parsed = JSON.parse(fnCall.arguments as string)
    } catch (e) {
      console.error('Failed to parse tone suggestions')
      return NextResponse.json([])
    }

    const edits = Array.isArray(parsed?.edits) ? parsed.edits.slice(0,1) : []

    // Map similar to gpt-check route
    let searchCursor = 0
    const errorsUnsorted = edits.map((edit: any) => {
      let startIdx = -1
      if (typeof edit.original === 'string' && edit.original.length > 0) {
        startIdx = text.indexOf(edit.original, searchCursor)
        if (startIdx === -1) startIdx = text.indexOf(edit.original)
      }
      if (startIdx === -1) return null
      const endIdx = startIdx + edit.original.length
      searchCursor = endIdx
      return {
        type: 'style' as const,
        word: edit.original,
        start: startIdx,
        end: endIdx,
        suggestion: edit.suggestion,
        context: undefined,
      }
    }).filter(Boolean)

    const errors = (errorsUnsorted as any[]).sort((a, b) => (a.start as number) - (b.start as number))

    return NextResponse.json(errors)
  } catch (error) {
    console.error('tone route err', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 