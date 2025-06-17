import { NextRequest, NextResponse } from 'next/server'

// Public LanguageTool endpoint – free, rate-limited (~20 req/min)
const LANGUAGE_TOOL_ENDPOINT = 'https://api.languagetool.org/v2/check'

interface TextError {
  type: 'spelling' | 'grammar'
  word: string
  start: number
  end: number
  suggestion?: string
  context?: string
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text supplied' }, { status: 400 })
    }

    // Very short inputs don't need checking
    if (text.trim().length < 5) {
      return NextResponse.json([])
    }

    // LanguageTool expects form-urlencoded
    const params = new URLSearchParams()
    params.append('text', text)
    params.append('language', 'en-US')
    // You can tweak the enabled rules further by uncommenting below
    // params.append('enabledOnly', 'false')

    const ltResponse = await fetch(LANGUAGE_TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      // Prevent the request from hanging forever
      next: { revalidate: 0 },
    })

    if (!ltResponse.ok) {
      const errText = await ltResponse.text()
      console.error('LanguageTool error:', errText)
      return NextResponse.json({ error: 'LanguageTool request failed' }, { status: 502 })
    }

    const data = await ltResponse.json()

    // data.matches is an array of issues
    const errors: TextError[] = (data.matches || []).slice(0, 50).map((match: any) => {
      const start = match.offset
      const end = match.offset + match.length
      const word = text.substring(start, end)
      const suggestion = match.replacements?.[0]?.value || ''

      // Classify – most spelling mistakes come from the MORFOLOGIK rule or issueType === 'misspelling'
      let type: TextError['type'] = 'grammar'
      if (
        match.rule?.issueType === 'misspelling' ||
        match.rule?.issueType === 'typographical' ||
        match.rule?.id?.includes('MORFOLOGIK')
      ) {
        type = 'spelling'
      }

      return { type, word, start, end, suggestion }
    })

    return NextResponse.json(errors)
  } catch (error) {
    console.error('grammar-check route error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 