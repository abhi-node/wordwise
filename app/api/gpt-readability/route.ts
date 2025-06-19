import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    if (text.trim().length < 20) {
      return NextResponse.json({ readability: 0, clarity: 0, conciseness: 0 })
    }

    // -------------------------------------------------------------
    // GPT-based textual analysis – readability, clarity, conciseness
    // -------------------------------------------------------------
    let readability = 0
    let clarity = 0
    let conciseness = 0
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
                "You are a writing analysis assistant. Assess the provided text and produce THREE separate integer scores ranging from 0-100 inclusive, where higher is better.\n\nMetrics to score (weight each independently):\n1. Readability – overall ease to read, including grammar and sentence flow.\n2. Clarity – focus, coherence, and how clearly the main message is delivered.\n3. Conciseness – brevity and lack of unnecessary verbosity.\n\nReturn the scores EXACTLY in this machine-readable format (no extra words):\nREADABILITY=<integer>;CLARITY=<integer>;CONCISENESS=<integer>"
            },
            { role: 'user', content: text.substring(0, 12000) }
          ]
        })

        const raw = completion.choices?.[0]?.message?.content?.trim() || ''
        // Expected format: READABILITY=90;CLARITY=85;CONCISENESS=76
        const parts = raw.split(';')
        parts.forEach(p => {
          const [key, val] = p.split('=')
          const num = parseInt((val ?? '').trim(), 10)
          if (isNaN(num)) return
          const clamped = Math.max(0, Math.min(100, num))
          switch ((key || '').trim().toUpperCase()) {
            case 'READABILITY':
              readability = clamped
              break
            case 'CLARITY':
              clarity = clamped
              break
            case 'CONCISENESS':
              conciseness = clamped
              break
          }
        })
      }
    } catch (gptErr) {
      console.error('GPT readability fetch failed', gptErr)
    }

    return NextResponse.json({ readability, clarity, conciseness })
  } catch (error) {
    console.error('Readability route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 