"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Type,
  PencilLine,
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
import { Label } from "@/components/ui/label"
import { getPlainTextFromDoc, findTextInDoc, posFromCharIndex, mapCharacterPositions, TextError } from '@/lib/editorUtils'
import { gptCheck, gptToneSuggest, gptSpellCheck } from '@/lib/editorApi'
import ErrorHighlight from '@/plugins/errorHighlight'
import { injectEditorGlobalStyles } from '@/components/editor/injectGlobalStyles'

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
  status: "academic" | "professional" | "casual" | "other" | "draft" | "published" | "archived"
  tags: string[]
  content: JSONContent
  userId: string
}

interface TextEditorProps {
  document: FirestoreDocument
  onClose: () => void
  onSave: (content: JSONContent) => Promise<void>
}

type DocumentStatus = 'academic' | 'professional' | 'casual' | 'other' | 'draft' | 'published' | 'archived'

// Inject global editor styles once on the client
injectEditorGlobalStyles()

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
  const [readabilityMetrics, setReadabilityMetrics] = useState<{readability:number, clarity:number, conciseness:number} | null>(null)
  const [readabilityOpen, setReadabilityOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // NEW: Track previous plain-text snapshot to detect space-bar events
  // ---------------------------------------------------------------------------
  const prevPlainTextRef = useRef<string>('')

  // Memoized extraction of feedback bullet points
  const feedbackLines = useMemo(() => {
    if (!feedback) return []
    return feedback
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^[-•]\s*/, ''))
  }, [feedback])

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
        body: JSON.stringify({ text, docType: document.status }),
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

      // ---------------------------------------------------------------------
      // NEW: Detect space-bar insertion and trigger a lightweight GPT spell check
      // ---------------------------------------------------------------------
      const plainText = getPlainTextFromDoc(editor.state.doc)
      if (plainText.endsWith(' ') && !prevPlainTextRef.current.endsWith(' ')) {
        const trimmed = plainText.trimEnd() // drop the trailing space we just detected
        const words = trimmed.split(/\s+/)
        const lastTwoWords = words.slice(-2).join(' ')
        const snippetStart = trimmed.length - lastTwoWords.length

        ;(async () => {
          if (lastTwoWords.trim().length === 0) return
          const errs = await gptSpellCheck(lastTwoWords)
          if (!errs || errs.length === 0) return
          // Map local positions to global document coordinates
          const adjusted = errs.map(e => ({
            ...e,
            start: e.start + snippetStart,
            end: e.end + snippetStart,
          }))
          const enriched = mapCharacterPositions(editor.state.doc, plainText, adjusted)
          // Filter out redundant suggestions where the replacement is identical
          const filtered = enriched.filter(err => (err.suggestion || '').trim() !== (err.word || '').trim())

          setErrors(prev => {
            const merged = new Map<string, TextError>()
            const add = (err:TextError) => merged.set(`${err.start}-${err.end}-${err.type}-${err.word}`, err)
            prev.forEach(add)
            filtered.forEach(add)
            return Array.from(merged.values())
          })
        })()
      }
      // keep snapshot for next update comparison
      prevPlainTextRef.current = plainText

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

  // Performs GPT-based advanced grammar & punctuation checks.
  // When `deep` is false we skip heavy analysis – used to avoid
  // unnecessary calls while the user is actively typing.
  const checkTextForErrors = useCallback((text: string, doc?: any, deep: boolean = true) => {
    if (!text.trim() || text.length < 5) {
      setErrors(prev => prev.filter(e => e.type === 'style')) // keep style suggestions
      return
    }

    // Skip expensive work during shallow passes
    if (!deep) return

    const myCheckId = ++latestCheckIdRef.current
    setIsChecking(true)

    const currentDoc = doc ?? editor?.state.doc

    gptCheck(text)
      .then((gptErrors) => {
        if (latestCheckIdRef.current !== myCheckId) return

        const enriched = currentDoc ? mapCharacterPositions(currentDoc, text, gptErrors) : gptErrors
        // Remove suggestions where replacement equals the original text
        const filtered = enriched.filter(err => (err.suggestion || '').trim() !== (err.word || '').trim())

        // Preserve existing style suggestions
        setErrors(prev => {
          const styles = prev.filter(e => e.type === 'style')
          return [...styles, ...filtered]
        })
      })
      .catch(err => console.error('GPT grammar error:', err))
      .finally(() => {
        if (latestCheckIdRef.current === myCheckId) setIsChecking(false)
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
      const metrics = {
        readability: typeof data?.readability === 'number' ? data.readability : 0,
        clarity: typeof data?.clarity === 'number' ? data.clarity : 0,
        conciseness: typeof data?.conciseness === 'number' ? data.conciseness : 0,
      }
      setReadabilityMetrics(metrics)
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

  // -------------------------------------------------------------
  // Document type handling
  // -------------------------------------------------------------
  const [docStatus, setDocStatus] = useState<DocumentStatus>(document.status)

  const handleStatusChange = async (value: DocumentStatus) => {
    if (!user) {
      toast.error('Authentication error. Please sign in again.')
      return
    }
    if (value === docStatus) return
    setDocStatus(value)
    try {
      const docRef = doc(db, 'documents', document.id)
      await updateDoc(docRef, {
        status: value,
        updatedAt: new Date(),
      })
      toast.success('Document type updated')
    } catch (err) {
      console.error('Error updating document status', err)
      toast.error('Failed to update document type')
    }
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

      // Always capture the freshest editor state to avoid missing recently applied suggestions
      const latestContent = editor.getJSON()

      const cleanContent = stripUndefined(latestContent)

      const updateData = {
        content: cleanContent,
        updatedAt: new Date(),
        textContent: getPlainTextFromDoc(editor.state.doc),
        wordCount: getPlainTextFromDoc(editor.state.doc).split(/\s+/).filter(Boolean).length,
        status: docStatus,
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
  }, [user, editor, document.id, onSave, docStatus])

  const handleClose = useCallback(async () => {
    if (isTyping) {
      const shouldSave = window.confirm("You have unsaved changes. Would you like to save before closing?")
      if (shouldSave) {
        await handleSave()
      }
    }
    onClose()
  }, [isTyping, handleSave, onClose])

  // ------------------------------
  // Auto-save when the user stops typing
  // ------------------------------
  const prevIsTypingRef = useRef(false)
  useEffect(() => {
    if (prevIsTypingRef.current && !isTyping) {
      // The user just transitioned from typing → idle; trigger an auto-save
      handleSave()
    }
    prevIsTypingRef.current = isTyping
  }, [isTyping, handleSave])

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
          status={docStatus}
          onStatusChange={handleStatusChange}
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
                      {feedbackLines.map((line, idx) => (
                        <Card key={idx} style={styles.feedbackCard}>
                          <CardContent style={styles.errorContent}>
                            <p style={styles.feedbackText}>{line}</p>
                          </CardContent>
                        </Card>
                      ))}
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
                            </div>
                            <div style={{ ...styles.errorDetails, display: 'flex', flexDirection: 'column' }}>
                              <p style={styles.errorTitle}>
                                {error.type === 'spelling'
                                  ? `Spelling: "${error.word}"`
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
                                    const plainNow = getPlainTextFromDoc(editor.state.doc)
                                    let charIndex = -1

                                    if (error.word) {
                                      // Try to locate the nth occurrence of the word in the **current** document.
                                      const nth = error.occurrence ?? 0
                                      let searchPos = 0
                                      for (let i = 0; i <= nth; i++) {
                                        charIndex = plainNow.indexOf(error.word, searchPos)
                                        if (charIndex === -1) break
                                        searchPos = charIndex + error.word.length
                                      }
                                      if (charIndex !== -1) {
                                        from = posFromCharIndex(editor.state.doc, charIndex)
                                        to = posFromCharIndex(editor.state.doc, charIndex + error.word.length)
                                      }
                                    }

                                    // As a final fallback, rely on approximate search around original start index
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
                                  }

                                  if (typeof from !== 'number' || typeof to !== 'number' || from > to) {
                                    toast.error('Could not locate text to replace. Please try again.')
                                    return
                                  }

                                  try {
                                    // Mark that the next TipTap onUpdate should not trigger an immediate re-check
                                    skipNextUpdateRef.current = true

                                    // Calculate delta to adjust subsequent error indices
                                    const suggestionText = error.suggestion || ''
                                    const originalLength = error.end - error.start
                                    const delta = suggestionText.length - originalLength

                                    // We will update the errors list *after* applying the doc change

                                    // ---------------------------------------------
                                    // Handle insertion, deletion, or replacement
                                    // ---------------------------------------------
                                    if (from === to) {
                                      // Pure insertion (e.g. missing punctuation)
                                      editor.chain().focus().insertContentAt(from, suggestionText).run()
                                    } else if (suggestionText.length === 0) {
                                      // Deletion – remove the offending range
                                      editor.chain().focus().deleteRange({ from, to }).run()
                                    } else {
                                      // Standard replacement
                                      editor.chain().focus().insertContentAt({ from, to }, suggestionText).run()
                                    }

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

                                    // -----------------------------
                                    // Adjust remaining error indices
                                    // -----------------------------
                                    setErrors(prev => {
                                      const updated: TextError[] = []
                                      prev.forEach(e => {
                                        if (e === error) return // skip handled error (should not happen as we remove below)
                                        // Shift only those that start **after** the position we edited. Overlapping ones will be rechecked shortly anyway.
                                        if (e.start >= error.end) {
                                          updated.push({
                                            ...e,
                                            start: e.start + delta,
                                            end: e.end + delta,
                                            // Force regeneration of from/to mapping on next decoration render
                                            from: undefined,
                                            to: undefined,
                                          })
                                        } else {
                                          updated.push(e)
                                        }
                                      })
                                      return updated
                                    })

                                    // Finally remove the handled error from the list (if still present)
                                    setErrors(prev => prev.filter(e => e !== error))

                                    // ---------------------------------------------------
                                    // NEW: Run a fresh deep check for grammar/punctuation
                                    // ---------------------------------------------------
                                    if (error.type !== 'style') {
                                      // Defer slightly so TipTap finishes its internal update cycle
                                      setTimeout(() => {
                                        const updatedPlain = getPlainTextFromDoc(editor.state.doc)
                                        checkTextForErrors(updatedPlain, editor.state.doc, true)
                                      }, 100)
                                    }

                                    // Auto-save after a suggestion is accepted
                                    handleSave()
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

                                    // Run an advanced GPT check on the full document
                                    setTimeout(() => {
                                      if (!editor) return
                                      const fullText = getPlainTextFromDoc(editor.state.doc)
                                      checkTextForErrors(fullText, editor.state.doc, true)
                                    }, 100)
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
        readabilityMetrics={readabilityMetrics}
      />
    </div>
  )
}