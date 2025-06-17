import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    if (text.trim().length < 20) {
      return NextResponse.json({ readability: 0 })
    }

    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a writing analysis assistant. Evaluate the provided text’s readability holistically.\n\nSpecifically:\n1. Consider CLARITY: Are the sentences straightforward and unambiguous?\n2. Consider MESSAGE: Is the main point delivered effectively without unnecessary complexity?\n3. Consider COHERENCE: Does the text flow logically from idea to idea?\n\nAfter judging these three facets, derive ONE OVERALL READABILITY SCORE on a 0-100 scale (where higher means easier to read).\n\nReturn ONLY that raw integer score (0-100). ABSOLUTELY NO additional words, labels, punctuation, or explanation. If the score would fall below 0, output 0; if above 100, output 100.'
        },
        {
          role: 'user',
          content: `Text:\n"""${text}"""`
        }
      ]
    })

    let scoreRaw = completion.choices?.[0]?.message?.content?.trim() || '0'

    // Extract first number 0-100
    const match = scoreRaw.match(/\d{1,3}/)
    let score = match ? parseInt(match[0], 10) : 0
    if (isNaN(score)) score = 0
    if (score > 100) score = 100
    if (score < 0) score = 0

    return NextResponse.json({ readability: score })
  } catch (error) {
    console.error('GPT-readability route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 