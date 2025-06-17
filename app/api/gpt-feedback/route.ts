import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client with the secret key from the environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Short-circuit for extremely small inputs
    if (text.trim().length < 20) {
      return NextResponse.json({ feedback: 'Please provide a longer document to receive meaningful feedback.' })
    }

    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert writing coach. Read the user\'s entire document and identify the MAIN issues affecting clarity, coherence, tone, structure, or overall effectiveness. Respond with a SINGLE short paragraph of no more than 75 words (roughly 2-3 sentences). Do NOT use bullet points, numbered lists, headings, greetings, or sign-offs—just the paragraph.'
        },
        {
          role: 'user',
          content: `Here is the document enclosed in triple quotes:\n\n"""${text}"""`
        }
      ]
    })

    const feedback = completion.choices?.[0]?.message?.content?.trim() || ''

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('GPT-feedback route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 