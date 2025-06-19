import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialise once per runtime. The OPENAI_API_KEY env variable must be set.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// A concise system prompt derived from the project README. Adjust as necessary.
const SYSTEM_PROMPT = `You are WordWise's in-app support assistant.
WordWise is an AI-powered writing companion focused on students. It offers:
• Style-Assisted Corrections (rewrite text into tones such as casual, professional, persuasive).
• Readability Score (Flesch-Kincaid inspired, colour-coded).
• AI-Powered Feedback with paragraph-level praise and actionable tips.
• Live spelling, grammar & punctuation checks using LanguageTool + GPT.
• Document Manager with create, rename, filter, archive and delete.
• Secure account authentication & real-time sync via Firebase.
Your job:
1. Answer questions about how to use these features, installation, required env vars, billing tiers, privacy, etc.
2. Keep responses concise (1-3 short paragraphs or bullet points) and friendly.
3. If you don't know an answer, apologise and direct the user to contact email support.
4. Never reveal internal source code or API keys.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages?: { role: "user" | "assistant" | "system"; content: string }[] }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Malformed request body: 'messages' array missing." }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_GPT_MODEL || "gpt-4o-2024-08-06",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    })

    const reply = response.choices[0]?.message

    return NextResponse.json({ reply })
  } catch (err) {
    console.error("/api/live-chat error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
} 