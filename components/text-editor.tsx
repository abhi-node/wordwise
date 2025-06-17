"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Type,
  PencilLine,
  Quote,
  AlertCircle,
  CheckCircle,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { JSONContent } from '@tiptap/core'
import { toast } from "sonner"
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Label } from "@/components/ui/label"

// Extracted sub-components and shared styles
import { styles } from "./editor/styles"
import { EditorHeader } from "./editor/EditorHeader"
import { EditorToolbar } from "./editor/EditorToolbar"
import { ReadabilityDialog } from "./editor/ReadabilityDialog"

interface FirestoreDocument {
  id: string
  title: string
  description: string
  author: string
  createdAt: Date
  updatedAt: Date
  status: "draft" | "published" | "archived"
  tags: string[]
  content: JSONContent
  userId: string
}

interface TextEditorProps {
  document: FirestoreDocument
  onClose: () => void
  onSave: (content: JSONContent) => Promise<void>
}

interface TextError {
  type: "spelling" | "grammar" | "punctuation" | "style"
  word: string
  start: number
  end: number
  suggestion?: string
  context?: string
  from?: number
  to?: number
  source?: 'lt' | 'gpt'
}

// Add keyframes for animations
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .text-editor-content .ProseMirror {
    outline: none !important;
    /* Ensure the editor always shows a reasonable canvas even when empty */
    min-height: 70vh;
    font-size: 1.125rem;
    line-height: 1.75;
    color: #374151;
    width: 100%;
    /* Reduce the left / right padding by 75% so the text block fills more of the
       available space while keeping sensible spacing at the top & bottom. */
    padding: 16px 6px 32px; /* top 16px, left/right 6px, bottom 32px */
    box-sizing: border-box;
  }
  
  .text-editor-content .ProseMirror:focus {
    outline: none !important;
  }
  
  .text-editor-content .ProseMirror p {
    margin: 1.25em 0;
  }
  
  .text-editor-content .ProseMirror h1 {
    font-size: 2.25em;
    margin-top: 0;
    margin-bottom: 0.8888889em;
    line-height: 1.1111111;
  }
  
  .text-editor-content .ProseMirror h2 {
    font-size: 1.5em;
    margin-top: 2em;
    margin-bottom: 1em;
    line-height: 1.3333333;
  }
  
  .text-editor-content .ProseMirror h3 {
    font-size: 1.25em;
    margin-top: 1.6em;
    margin-bottom: 0.6em;
    line-height: 1.6;
  }
  
  .text-editor-content .ProseMirror strong {
    font-weight: 600;
  }
  
  .text-editor-content .ProseMirror em {
    font-style: italic;
  }
  
  .text-editor-content .ProseMirror u {
    text-decoration: underline;
  }
  
  @media (min-width: 768px) {
    .text-editor-content .ProseMirror {
      padding: 24px 6px; /* maintain vertical padding, shrink horizontal */
    }
  }
  
  @media (min-width: 1024px) {
    .text-editor-content .ProseMirror {
      padding: 32px 8px; /* slightly wider on very large screens */
    }
  }

  /* Error highlight backgrounds */
  .error-spelling { background-color: rgba(239, 68, 68, 0.3); }
  .error-grammar { background-color: rgba(234, 179, 8, 0.3); }
  .error-punctuation { background-color: rgba(37, 99, 235, 0.3); }
  .error-style { background-color: rgba(16, 185, 129, 0.3); }
`
document.head.appendChild(styleSheet)

// Helper to convert char index to ProseMirror position
function posFromCharIndex(doc: any, index: number): number {
  // Clamp negative indices
  if (index <= 0) return 1

  // Fast path – if index is beyond document text length, return end
  const totalTextLength = doc.textBetween(0, doc.content.size, "\n").length
  if (index >= totalTextLength) return doc.content.size

  // Binary search for the smallest position whose textBetween length >= index
  let lo = 0
  let hi = doc.content.size
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const len = doc.textBetween(0, mid, "\n").length
    if (len < index) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return Math.max(1, lo)
}

// Enhanced function to find text in ProseMirror doc more reliably
function findTextInDoc(doc: any, searchText: string, startOffset: number = 0, originalStart?: number): { from: number; to: number } | null {
  const docText = getPlainTextFromDoc(doc)
  
  // If we have the original character position, try to find near that position first
  if (originalStart !== undefined) {
    // Look for exact match at or near the original position
    const window = Math.min(50, searchText.length * 2) // Small window around original position
    const searchStart = Math.max(0, originalStart - window)
    const searchEnd = Math.min(docText.length, originalStart + searchText.length + window)
    const nearbyText = docText.substring(searchStart, searchEnd)
    const relativeIndex = nearbyText.indexOf(searchText)
    
    if (relativeIndex !== -1) {
      const actualIndex = searchStart + relativeIndex
      return {
        from: posFromCharIndex(doc, actualIndex),
        to: posFromCharIndex(doc, actualIndex + searchText.length)
      }
    }
  }
  
  // Fallback to standard search
  const index = docText.indexOf(searchText, startOffset)
  if (index === -1) return null
  
  return {
    from: posFromCharIndex(doc, index),
    to: posFromCharIndex(doc, index + searchText.length)
  }
}

// Get plain text representation that matches what editor.getText() returns
function getPlainTextFromDoc(doc: any): string {
  let text = ''
  let isFirstBlock = true
  
  doc.descendants((node: any) => {
    if (node.isText) {
      text += node.text || ''
    } else if (node.isBlock && node.type.name !== 'doc') {
      // Add newlines between blocks (paragraphs, headings, etc.)
      if (!isFirstBlock && text.length > 0) {
        text += '\n'
      }
      isFirstBlock = false
    }
    return true
  })
  
  return text
}

// Map error character indices to ProseMirror positions for precise replacements
function mapCharacterPositions(doc: any, fullText: string, errs: TextError[]): TextError[] {
  return errs.map((err) => {
    // Extract the exact substring that was flagged
    const flaggedText = fullText.slice(err.start, err.end)

    // First, try to locate the exact substring near the original position
    let match = findTextInDoc(doc, flaggedText, 0, err.start)
    let from: number | undefined = match?.from
    let to: number | undefined = match?.to

    // If that fails and we have an offending word, try locating by that word
    if ((from === undefined || to === undefined) && err.word) {
      match = findTextInDoc(doc, err.word, 0, err.start)
      from = match?.from
      to = match?.to
    }

    // Final fallback – naive char→pos mapping (may be off around newlines)
    if (from === undefined || to === undefined) {
      from = posFromCharIndex(doc, err.start)
      to = posFromCharIndex(doc, err.end)
    }

    return { ...err, from, to }
  })
}

const highlightPluginKey = new PluginKey('error-highlight')

function createHighlightPlugin(errorsRef: React.MutableRefObject<TextError[]>) {
  return new Plugin({
    key: highlightPluginKey,
    props: {
      decorations(state: EditorState) {
        const decorations: any[] = []
        const errors = errorsRef.current || []
        errors.forEach((err) => {
          const from = err.from ?? posFromCharIndex(state.doc, err.start)
          const to = err.to ?? posFromCharIndex(state.doc, err.end)
          if (to > from) {
            decorations.push(
              Decoration.inline(from, to, { class: `error-${err.type}` })
            )
          }
        })
        return DecorationSet.create(state.doc, decorations)
      },
    },
  })
}

const ErrorHighlight = Extension.create({
  name: 'errorHighlight',
  addOptions() {
    return {
      errorsRef: null as React.MutableRefObject<TextError[]> | null,
    }
  },
  addProseMirrorPlugins() {
    if (!this.options.errorsRef) return []
    return [createHighlightPlugin(this.options.errorsRef)]
  },
})

export default function TextEditor({ document, onClose, onSave }: TextEditorProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<TextError[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorsRef = useRef<TextError[]>([])
  const lastStyleTextRef = useRef<string>('')
  const lastCheckedTextRef = useRef<string>('')
  // Tone selection state (only one tone can be active at a time)
  const [selectedTone, setSelectedTone] = useState<'casual' | 'professional' | 'persuasive' | null>(null)
  const [styleSuggestionPool, setStyleSuggestionPool] = useState<TextError[]>([])

  // Flag that allows us to skip the onUpdate-driven re-check right after we
  // programmatically accept/decline a suggestion. This prevents the extra
  // network round-trip from starting before the UI has a chance to update.
  const skipNextUpdateRef = useRef(false)

  // ------------------------------
  // AI Feedback state & helpers
  // ------------------------------
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [feedbackStale, setFeedbackStale] = useState(false)
  const [content, setContent] = useState<JSONContent>(
    document.content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '',
            },
          ],
        },
      ],
    }
  )
  const latestCheckIdRef = useRef(0)
  const [isGeneratingReadability, setIsGeneratingReadability] = useState(false)
  const [readabilityScore, setReadabilityScore] = useState<number | null>(null)
  const [readabilityOpen, setReadabilityOpen] = useState(false)

  const generateFeedback = async () => {
    if (!editor) return
    const text = getPlainTextFromDoc(editor.state.doc)
    if (!text.trim()) {
      toast.warning('Document is empty. Please add some content before requesting feedback.')
      return
    }
    try {
      setIsGeneratingFeedback(true)
      // keep existing feedback visible while regenerating if desired
      const res = await fetch('/api/gpt-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        console.error('GPT feedback failed', await res.text())
        toast.error('Failed to generate feedback. Please try again.')
        return
      }
      const data = await res.json()
      setFeedback(typeof data?.feedback === 'string' ? data.feedback : '')
      setFeedbackStale(false)
    } catch (err) {
      console.error('GPT feedback error', err)
      toast.error('Failed to generate feedback. Please try again.')
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  // --- Spell & Grammar checker (LanguageTool proxy) ---
  // We moved away from a heavy in-browser Web Worker and now proxy requests to
  // the free public LanguageTool API via /api/grammar-check. The ref remains
  // only to avoid larger refactors elsewhere.
  const localWorkerRef = useRef<null>(null)

  // Helper that calls the new server route
  async function ltCheck(text: string): Promise<TextError[]> {
    try {
      const res = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        console.error('LanguageTool check failed', await res.text())
        return []
      }
      const data = await res.json()
      return Array.isArray(data) ? data.map((e:any)=>({ ...e, source:'lt' })) : []
    } catch (err) {
      console.error('LanguageTool check error', err)
      return []
    }
  }

  // --- GPT-4o client helper ---
  async function gptCheck(text: string): Promise<TextError[]> {
    try {
      const res = await fetch('/api/gpt-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!res.ok) {
        console.error('GPT check failed', await res.text())
        return []
      }
      const data = await res.json()
      return Array.isArray(data) ? data.map((e:any)=>({ ...e, source:'gpt' })) : []
    } catch (err) {
      console.error('GPT check error', err)
      return []
    }
  }

  // --- GPT tone suggestion helper ---
  async function gptToneSuggest(tone: 'casual' | 'professional' | 'persuasive', text: string): Promise<TextError[]> {
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
      return Array.isArray(data) ? data.map((e:any)=>({ ...e, source:'gpt' })) : []
    } catch (err) {
      console.error('GPT tone suggestion error', err)
      return []
    }
  }

  const extensions = useMemo(() => [
    StarterKit,
    ErrorHighlight.configure({ errorsRef }),
  ], []); // errorsRef is stable, so this is safe.

  const editor = useEditor({
    extensions,
    content: document.content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '',
            },
          ],
        },
      ],
    },
    onUpdate: ({ editor }) => {
      // If this update was triggered by us (e.g. accepting a suggestion), we
      // merely reset the flag and bail early. A background interval re-check
      // will still run shortly after, keeping the analysis fresh but NOT
      // blocking the UI thread.
      if (skipNextUpdateRef.current) {
        skipNextUpdateRef.current = false
        return
      }

      const content = editor.getJSON()
      setContent(content)
      setIsTyping(true)
      // Mark existing feedback stale if user edits after feedback was generated
      if (feedback) {
        setFeedbackStale(true)
      }
      // Do NOT clear existing errors immediately; they will be replaced once the async check finishes.
      setErrors((prev) => {
        if (!editor || prev.length === 0) return prev
        const currentDoc = editor.state.doc
        
        // Update positions for existing errors after content changes
        return prev.map((err) => {
          // Try to find the error text in the updated document
          const textMatch = findTextInDoc(currentDoc, err.word || '', 0, err.start)
          if (textMatch) {
            return { ...err, from: textMatch.from, to: textMatch.to }
          }
          
          // Fallback to character index mapping
          return {
            ...err,
            from: posFromCharIndex(currentDoc, err.start),
            to: posFromCharIndex(currentDoc, err.end)
          }
        })
      })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 500)

      // Start error checking after user stops typing
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }

      checkTimeoutRef.current = setTimeout(() => {
        checkTextForErrors(getPlainTextFromDoc(editor.state.doc), editor.state.doc, true)
      }, 1000) // quicker re-check for better highlight accuracy
    },
    editorProps: {
      attributes: {
        class: 'text-editor-content',
      },
    },
  })

  // Runs language-tool checks every call, and GPT checks only when `deep` is true.
  const checkTextForErrors = useCallback((text: string, doc?: any, deep: boolean = true) => {
    if (!text.trim() || text.length < 5) {
      setErrors([])
      return
    }

    const myCheckId = ++latestCheckIdRef.current
    setIsChecking(true)

    // This function now ONLY handles grammar, spelling, and punctuation.
    // Style suggestions are handled by a separate flow.
    ltCheck(text)
      .then((ltErrors) => {
        if (latestCheckIdRef.current !== myCheckId) return

        const currentDoc = doc ?? editor?.state.doc
        
        // If we're in a *soft* pass while the user is still typing, we only surface
        // spelling mistakes so we don't overwhelm the UI or the user.
        const ltFiltered = deep ? ltErrors : ltErrors.filter(e => e.type === 'spelling')

        const enrichedLt = currentDoc ? mapCharacterPositions(currentDoc, text, ltFiltered) : ltFiltered

        // When updating, we must preserve any existing style suggestions AND any
        // deep GPT suggestions that we might have already shown. We therefore
        // selectively replace only the error types that we just recomputed.
        setErrors(prev => {
          const preserved = prev.filter(e => {
            // keep style always
            if (e.type === 'style') return true
            // In a soft pass we only refresh spelling errors – keep existing grammar/punctuation
            if (!deep && (e.type === 'grammar' || e.type === 'punctuation')) return true
            // otherwise discard (we will refresh them below / via ltFiltered)
            return false
          })
          return [...preserved, ...enrichedLt]
        })

        // Trigger the heavy GPT analysis only when deep === true
        if (!deep) {
          if (latestCheckIdRef.current === myCheckId) setIsChecking(false)
          return
        }

        // Now fetch deeper GPT grammar suggestions and merge when ready
        gptCheck(text)
          .then((gptErrors) => {
            if (latestCheckIdRef.current !== myCheckId) return

            const mergedMap = new Map<string, TextError>()
            const push = (err: TextError) => {
              mergedMap.set(`${err.start}-${err.end}-${err.type}-${err.word}`, err)
            }
            ltFiltered.forEach(push)
            gptErrors.forEach(push)

            const mergedErrors = Array.from(mergedMap.values())
            const enrichedMerged = currentDoc ? mapCharacterPositions(currentDoc, text, mergedErrors) : mergedErrors
            
            // Again, preserve existing style suggestions
            setErrors(prev => {
              const styles = prev.filter(e => e.type === 'style')
              return [...styles, ...enrichedMerged]
            })
          })
          .catch((err) => console.error('GPT grammar error:', err))
          .finally(() => {
            if (latestCheckIdRef.current === myCheckId) setIsChecking(false)
          })
      })
      .catch((e) => {
        console.error('LanguageTool error:', e)
        if (latestCheckIdRef.current === myCheckId) setIsChecking(false)
      })
  }, [editor])

  // Refresh only LanguageTool suggestions while keeping GPT ones untouched
  const refreshLanguageToolErrors = useCallback(async () => {
    if (!editor) return
    const text = getPlainTextFromDoc(editor.state.doc)
    const ltErrs = await ltCheck(text)
    const enriched = mapCharacterPositions(editor.state.doc, text, ltErrs)
    setErrors((prev) => {
      const gptErrs = prev.filter((e) => e.source === 'gpt' && e.type !== 'style') // Keep non-style GPT errors
      const styleErrs = prev.filter(e => e.type === 'style') // Keep style errors
      return [...enriched, ...gptErrs, ...styleErrs]
    })
  }, [editor])

  // Fetches a new batch of style suggestions, displaying 3 and keeping the rest in a pool.
  const initializeStyleSuggestions = useCallback(async (tone: 'casual' | 'professional' | 'persuasive') => {
    if (!editor) return
    setIsChecking(true)
    lastStyleTextRef.current = getPlainTextFromDoc(editor.state.doc)

    try {
      const allSuggestions = await gptToneSuggest(tone, lastStyleTextRef.current)
      const enriched = mapCharacterPositions(editor.state.doc, lastStyleTextRef.current, allSuggestions)

      const displaySuggestions = enriched.slice(0, 3)
      const remainingPool = enriched.slice(3)

      setStyleSuggestionPool(remainingPool)
      // Replace existing errors with a clean slate of grammar/spelling + the new style suggestions
      setErrors(prev => [...prev.filter(e => e.type !== 'style'), ...displaySuggestions])
    } catch (e) {
      console.error('Failed to initialize style suggestions', e)
    } finally {
      setIsChecking(false)
    }
  }, [editor])

  // Re-run checks when tone selection changes
  useEffect(() => {
    if (editor) {
      if (selectedTone) {
        initializeStyleSuggestions(selectedTone)
      } else {
        // When tone is deselected, clear the pool and remove style errors
        setStyleSuggestionPool([])
        setErrors(prev => prev.filter(e => e.type !== 'style'))
        // Optionally, run a regular check
        checkTextForErrors(getPlainTextFromDoc(editor.state.doc), editor.state.doc, true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTone, editor, initializeStyleSuggestions, checkTextForErrors])

  // ---------------------------------------------------------------------------
  // Live spell- & grammar-checking every 1.5 s even while the user is typing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!editor) return

    const interval = setInterval(() => {
      const currentText = getPlainTextFromDoc(editor.state.doc)
      // Skip if the text hasn't changed since the last check or is too short
      if (currentText === lastCheckedTextRef.current || currentText.trim().length < 5) {
        return
      }

      lastCheckedTextRef.current = currentText
      checkTextForErrors(currentText, editor.state.doc, false)
    }, 1500) // roughly every 1.5 seconds

    return () => clearInterval(interval)
  }, [editor, checkTextForErrors])

  // keep ref in sync
  errorsRef.current = errors

  // Force the editor view to re-evaluate decorations when the error list changes
  useEffect(() => {
    if (editor) {
      // Create an empty transaction to refresh the view (no content change)
      editor.view.dispatch(editor.state.tr)
    }
  }, [errors, editor])

  // ------------------------------
  // Readability analysis helpers
  // ------------------------------
  const generateReadability = async () => {
    if (!editor) return
    const text = getPlainTextFromDoc(editor.state.doc)
    if (!text.trim()) {
      toast.warning('Document is empty. Please add some content before requesting readability analysis.')
      return
    }
    try {
      setIsGeneratingReadability(true)
      const res = await fetch('/api/gpt-readability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!res.ok) {
        console.error('GPT readability failed', await res.text())
        toast.error('Failed to generate readability score.')
        return
      }
      const data = await res.json()
      const score = typeof data?.readability === 'number' ? data.readability : 0
      setReadabilityScore(score)
      setReadabilityOpen(true)
    } catch (err) {
      console.error('GPT readability error', err)
      toast.error('Failed to generate readability score.')
    } finally {
      setIsGeneratingReadability(false)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [])

  // Document statistics (computed only after hooks; safe because editor may still be null)
  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0
  const charCount = editor ? editor.getText().length : 0

  // -----------------------------------------------------------------------
  // Helpers & callbacks (restored after accidental removal)
  // -----------------------------------------------------------------------

  // Recursively remove any undefined values (Firestore does not allow them)
  const stripUndefined = (value: any): any => {
    if (Array.isArray(value)) {
      return value
        .map((v) => stripUndefined(v))
        .filter((v) => v !== undefined)
    }
    if (value && typeof value === 'object') {
      const result: Record<string, any> = {}
      Object.entries(value).forEach(([k, v]) => {
        if (v !== undefined) {
          const cleaned = stripUndefined(v)
          if (cleaned !== undefined) {
            result[k] = cleaned
          }
        }
      })
      return result
    }
    return value
  }

  const handleSave = useCallback(async () => {
    if (!user) {
      toast.error("Authentication error. Please try signing in again.")
      return
    }

    if (!editor) {
      toast.error("Editor not ready. Please try again.")
      return
    }

    setIsSaving(true)
    try {
      const docRef = doc(db, "documents", document.id)

      const cleanContent = stripUndefined(content)

      const updateData = {
        content: cleanContent,
        updatedAt: new Date(),
        textContent: getPlainTextFromDoc(editor.state.doc),
        wordCount: getPlainTextFromDoc(editor.state.doc).split(/\s+/).filter(Boolean).length,
      }

      await updateDoc(docRef, updateData)
      await onSave(cleanContent)
      toast.success("Document saved successfully!")
    } catch (error) {
      console.error("Error saving document:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save document: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }, [user, editor, content, document.id, onSave])

  const handleClose = useCallback(async () => {
    if (isTyping) {
      const shouldSave = window.confirm("You have unsaved changes. Would you like to save before closing?")
      if (shouldSave) {
        await handleSave()
      }
    }
    onClose()
  }, [isTyping, handleSave, onClose])

  // Save on ⌘/Ctrl+S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.document.addEventListener('keydown', handleKeyDown)
    return () => window.document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // -----------------------------------------------------------------------
  // Loading fallback — _must_ come **after** all Hooks to keep order stable
  // -----------------------------------------------------------------------
  if (!editor) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainCard}>
        {/* Header */}
        <EditorHeader
          title={document.title}
          wordCount={wordCount}
          isTyping={isTyping}
          isChecking={isChecking}
          onClose={handleClose}
          onSave={handleSave}
          isSaving={isSaving}
        />

        {/* Toolbar */}
        <EditorToolbar
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          generateReadability={generateReadability}
          isGeneratingReadability={isGeneratingReadability}
        />

        {/* Main Content Area */}
        <div style={styles.mainContent}>
          {/* Document Area */}
          <div style={styles.documentArea}>
            <div style={styles.documentContainer}>
              <div style={styles.editorWrapper}>
                <EditorContent 
                  editor={editor} 
                  className="text-editor-content"
                  style={{width: '100%', height: '100%', outline: 'none'}}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarContent}>
              <div>
                {/* Document Statistics */}
                <div style={styles.sidebarSection}>
                  <h3 style={styles.sectionTitle}>Document Statistics</h3>
                  <div>
                    <div style={styles.statRow}>
                      <Label style={styles.statLabel}>Words</Label>
                      <div style={styles.statValue}>{wordCount}</div>
                    </div>
                    <div style={styles.statRow}>
                      <Label style={styles.statLabel}>Characters</Label>
                      <div style={styles.statValue}>{charCount}</div>
                    </div>
                    <div style={styles.statRow}>
                      <Label style={styles.statLabel}>Reading time</Label>
                      <div style={styles.statValueSmall}>
                        {Math.ceil(wordCount / 200)} min
                      </div>
                    </div>
                    <div style={styles.statRow}>
                      <Label style={styles.statLabel}>Issues found</Label>
                      <div style={styles.issuesValue}>
                        {errors.length > 0 ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">{errors.length}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">0</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              
                {/* AI Feedback */}
                <div style={styles.sidebarSection}>
                  <h3 style={styles.sectionTitle}>AI Feedback</h3>
                  {feedback ? (
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                      <p style={styles.feedbackText}>{feedback}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateFeedback}
                        disabled={isGeneratingFeedback}
                        className="self-start"
                      >
                        {isGeneratingFeedback ? 'Regenerating...' : feedbackStale ? 'Regenerate Feedback' : 'Regenerate'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateFeedback}
                      disabled={isGeneratingFeedback}
                      className="w-full"
                    >
                      {isGeneratingFeedback ? 'Generating...' : 'Generate Feedback'}
                    </Button>
                  )}
                </div>

                {/* Document Suggestions */}
                <div style={styles.sidebarSection}>
                  <h3 style={styles.sectionTitle}>Document Suggestions</h3>
                  <div style={styles.suggestionsContainer}>
                    {errors.length === 0 && !isChecking && (
                      <div style={styles.noIssues}>
                        <CheckCircle className="h-8 lg:h-10 w-8 lg:w-10 text-green-500 mx-auto" />
                        <h4 style={styles.noIssuesTitle}>No Issues Found</h4>
                        <p style={styles.noIssuesText}>Your document looks great!</p>
                      </div>
                    )}
                    {isChecking && (
                      <div style={styles.checking}>
                        <div style={{...styles.spinner, height: '32px', width: '32px', margin: '0 auto'}}></div>
                        <p style={styles.checkingText}>Checking for suggestions...</p>
                      </div>
                    )}
                    {errors.map((error, index) => (
                      <Card
                        key={index}
                        style={{
                          ...styles.errorCard,
                          ...(error.type === 'spelling'
                            ? styles.errorCardSpelling
                            : error.type === 'punctuation'
                              ? styles.errorCardPunctuation
                              : error.type === 'style'
                                ? styles.errorCardStyle
                                : styles.errorCardGrammar)
                        }}
                      >
                        <CardContent style={styles.errorContent}>
                          <div style={styles.errorInner}>
                            <div
                              style={{
                                ...styles.errorIcon,
                                ...(error.type === 'spelling'
                                  ? styles.spellingIcon
                                  : error.type === 'punctuation'
                                    ? styles.punctuationIcon
                                    : error.type === 'style'
                                      ? styles.styleIcon
                                      : styles.grammarIcon)
                              }}
                            >
                              {error.type === 'spelling' && (
                                <Type className="h-3 lg:h-5 w-3 lg:w-5" />
                              )}
                              {error.type === 'grammar' && (
                                <PencilLine className="h-3 lg:h-5 w-3 lg:w-5" />
                              )}
                              {error.type === 'punctuation' && (
                                <Quote className="h-3 lg:h-5 w-3 lg:w-5" />
                              )}
                              {error.type === 'style' && (
                                <Sparkles className="h-3 lg:h-5 w-3 lg:w-5" />
                              )}
                            </div>
                            <div style={{ ...styles.errorDetails, display: 'flex', flexDirection: 'column' }}>
                              <p style={styles.errorTitle}>
                                {error.type === 'spelling'
                                  ? `Spelling: "${error.word}"`
                                  : error.type === 'punctuation'
                                    ? 'Punctuation'
                                    : error.type === 'style'
                                      ? 'Style'
                                      : 'Grammar'}
                              </p>
                              <p style={styles.errorSuggestion}>
                                Suggestion: <strong style={styles.suggestionText}>{error.suggestion}</strong>
                              </p>
                              <div style={{display:'flex',gap:'6px'}}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!editor) return

                                  // -----------------------------
                                  // Locate and replace the text
                                  // -----------------------------
                                  let from = error.from
                                  let to = error.to

                                  // Fallback look-ups if we don't have stored positions
                                  if (from === undefined || to === undefined) {
                                    const match = findTextInDoc(editor.state.doc, error.word || '', 0, error.start)
                                    if (match) {
                                      from = match.from
                                      to = match.to
                                    } else {
                                      from = posFromCharIndex(editor.state.doc, error.start)
                                      to = posFromCharIndex(editor.state.doc, error.end)
                                    }
                                  }

                                  if (typeof from !== 'number' || typeof to !== 'number' || to <= from) {
                                    toast.error('Could not locate text to replace. Please try again.')
                                    return
                                  }

                                  try {
                                    // Mark that the next TipTap onUpdate should not trigger an immediate re-check
                                    skipNextUpdateRef.current = true

                                    // Remove the handled error FIRST so the UI updates before we even edit the doc
                                    setErrors((prev) => prev.filter((e) => e !== error))

                                    // Apply the text replacement
                                    editor.chain().focus().insertContentAt({ from, to }, error.suggestion || '').run()

                                    // -----------------------------------------
                                    // Lightweight follow-up, no heavy recheck
                                    // -----------------------------------------
                                    if (error.type === 'style') {
                                      if (styleSuggestionPool.length > 0) {
                                        // Pop in another queued suggestion without hitting GPT again
                                        const [next, ...rest] = styleSuggestionPool
                                        setStyleSuggestionPool(rest)
                                        setErrors((prev) => [...prev, next])
                                      } else if (selectedTone) {
                                        // Only call GPT when the queue is empty
                                        initializeStyleSuggestions(selectedTone)
                                      }
                                    } else {
                                      // For grammar / spelling / punctuation we let the normal
                                      // 1.5-second interval checker refresh in the background –
                                      // avoids an immediate network call and keeps UI snappy.
                                    }
                                  } catch (err) {
                                    console.error('Error applying suggestion:', err)
                                    toast.error('Could not apply suggestion. Please try again.')
                                  }
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // When declining a style suggestion, replace it with the next from the pool
                                  if (error.type === 'style') {
                                    setErrors(prev => {
                                      const others = prev.filter(e => e !== error)
                                      const nextFromPool = styleSuggestionPool[0]
                                      return nextFromPool ? [...others, nextFromPool] : others
                                    })
                                    setStyleSuggestionPool(prev => prev.slice(1))
                                  } else {
                                    // Simply remove other suggestion types
                                    setErrors((prev) => prev.filter((e) => e !== error))
                                  }
                                }}
                              >
                                Decline
                              </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Readability dialog */}
      <ReadabilityDialog
        open={readabilityOpen}
        onOpenChange={setReadabilityOpen}
        readabilityScore={readabilityScore}
      />
    </div>
  )
}