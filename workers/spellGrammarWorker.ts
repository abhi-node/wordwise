// Web Worker for local spell & basic grammar checking
/**
 * This worker receives plain text and returns a list of detected errors in the
 * same format the editor expects (TextError[]).
 *
 * It uses the `retext` unified ecosystem with:
 *  – `retext-english`    – English language parser
 *  – `retext-spell`      – Hunspell-based spell checker
 *  – `dictionary-en-us`  – US English dictionary
 *  – (optionally) other small grammar plugins can be added later.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { unified } from 'unified'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import english from 'retext-english'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import spell from 'retext-spell'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nspell from 'nspell'

interface TextError {
  type: 'spelling' | 'grammar' | 'punctuation'
  word: string
  start: number
  end: number
  suggestion?: string
  context?: string
}

let processorPromise: Promise<any> | null = null

async function getProcessor() {
  if (!processorPromise) {
    processorPromise = (async () => {
      // Load Hunspell .aff and .dic via CDN (small, cached by browser)
      const base = 'https://cdn.jsdelivr.net/npm/dictionary-en@4.0.0/'
      const [affRes, dicRes] = await Promise.all([
        fetch(base + 'index.aff'),
        fetch(base + 'index.dic'),
      ])
      const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()])

      // Create nspell instance
      const nspellInstance = nspell(aff, dic)

      // Build processor
      // @ts-ignore
      const proc = unified().use(english as any).use(spell as any, { dictionary: nspellInstance })
      return proc
    })()
  }
  return processorPromise
}

self.onmessage = async (e: MessageEvent) => {
  const text: string = e.data
  try {
    const processor: any = await getProcessor()
    const file = await processor.process(text)

    const errors: TextError[] = (file.messages || []).map((msg: any) => {
      const { start, end } = msg.location
      const word = text.slice(start.offset, end.offset)
      const suggestions = msg.actual && msg.note ? [msg.note] : (msg?.replacements ?? [])
      let errType: TextError['type'] = 'spelling'
      // retext-spell sets `msg.source === 'retext-spell'`; we treat others as grammar
      if (msg.source && msg.source !== 'retext-spell') errType = 'grammar'

      return {
        type: errType,
        word,
        start: start.offset,
        end: end.offset,
        suggestion: suggestions?.[0] || msg.message,
      }
    })

    // Post back only first 25 for safety
    ;(self as any).postMessage(errors.slice(0, 25))
  } catch (err) {
    // Fail silently – simply return empty list so UI clears spinner
    ;(self as any).postMessage([])
  }
} 