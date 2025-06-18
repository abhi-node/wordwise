import type { TextError } from './editorUtils'

export async function gptCheck(text: string): Promise<TextError[]> {
  try {
    const res = await fetch('/api/gpt-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('GPT check failed', await res.text())
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map((e: any) => ({ ...e, source: 'gpt' })) : []
  } catch (err) {
    console.error('GPT check error', err)
    return []
  }
}

export async function gptToneSuggest(
  tone: 'casual' | 'professional' | 'persuasive',
  text: string
): Promise<TextError[]> {
  try {
    const res = await fetch('/api/gpt-tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tone }),
    })
    if (!res.ok) {
      console.error('GPT tone suggestion failed', await res.text())
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map((e: any) => ({ ...e, source: 'gpt' })) : []
  } catch (err) {
    console.error('GPT tone suggestion error', err)
    return []
  }
}

export async function gptSpellCheck(text: string): Promise<TextError[]> {
  try {
    const res = await fetch('/api/gpt-spell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('GPT spell check failed', await res.text())
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map((e: any) => ({ ...e, source: 'gpt' })) : []
  } catch (err) {
    console.error('GPT spell check error', err)
    return []
  }
} 