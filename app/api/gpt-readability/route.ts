import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    if (text.trim().length < 20) {
      return NextResponse.json({ readability: 0 })
    }

    // -------------------------------------------------------------
    // GPT-based readability analysis (sole metric)
    // -------------------------------------------------------------
    let gptScore: number = 0
    const openAiKey = process.env.OPENAI_API_KEY

    try {
      if (openAiKey) {
        const openai = new OpenAI({ apiKey: openAiKey })
        const model = process.env.OPENAI_GPT_MODEL || 'gpt-3.5-turbo'

        const completion = await openai.chat.completions.create({
          model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                "You are a writing analysis assistant. Evaluate the provided text's readability based on these three metrics:\n1. Focus and coherence of the writing.\n2. Overall clarity of the text and its message.\n3. Grammatical correctness of the piece.\n\nAfter weighing these equally, output a single INTEGER score between 0 and 100, where higher values indicate better readability. Return ONLY that number — no additional words or symbols."
            },
            { role: 'user', content: text.substring(0, 12000) }
          ]
        })

        const raw = completion.choices?.[0]?.message?.content?.trim() || ''
        const match = raw.match(/\d{1,3}/)
        const numeric = match ? parseInt(match[0], 10) : NaN
        if (!isNaN(numeric)) {
          gptScore = Math.min(100, Math.max(0, numeric))
        }
      }
    } catch (gptErr) {
      console.error('GPT readability fetch failed', gptErr)
    }

    return NextResponse.json({ readability: gptScore })
  } catch (error) {
    console.error('Readability route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 