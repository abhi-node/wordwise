import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client with the secret key from the environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text, docType } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Short-circuit for extremely small inputs
    if (text.trim().length < 20) {
      return NextResponse.json({ feedback: 'Please provide a longer document to receive meaningful feedback.' })
    }

    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-2024-08-06'

    // Determine prompt prefix based on document type
    const typePromptMap: Record<string, string> = {
      academic: 'Write feedback suitable for academic papers, focusing on clarity, evidence, and formal tone.',
      professional: 'Write feedback suitable for professional/business documents, emphasizing precision, conciseness, and professionalism.',
      casual: 'Write feedback suitable for casual writing, focusing on engagement, readability, and friendly tone.',
      other: 'Write feedback suitable for general writing.',
    }

    const docPrompt = typePromptMap[(docType || 'other') as keyof typeof typePromptMap] || typePromptMap.other

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            `${docPrompt} Read the user's entire document and identify the three MOST IMPORTANT issues that must be fixed. Respond with EXACTLY three bullet points, each preceded by "- ", describing ONE issue in under 15 words. Do NOT add any additional text, headings, greetings, or sign-offs.`
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