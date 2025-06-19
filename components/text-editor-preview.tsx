"use client"

import { useMemo, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Type, PencilLine } from "lucide-react"
import { EditorHeader } from "@/components/editor/EditorHeader"
import { EditorToolbar } from "@/components/editor/EditorToolbar"
import { styles } from "@/components/editor/styles"
import ErrorHighlight from "@/plugins/errorHighlight"
import { injectEditorGlobalStyles } from "@/components/editor/injectGlobalStyles"

// Ensure editor-specific global styles are present (runs once on the client)
injectEditorGlobalStyles()

export default function TextEditorPreview() {
  // Base text for the preview document (no inline mark-based highlighting; we'll rely on ErrorHighlight)
  const sampleText =
    "Thier are many benefits to using grammer checking software. It help writers produce high-quality content and colaborate more effectively."

  const sampleDoc = useMemo(
    () => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: sampleText }],
        },
      ],
    }),
    [],
  )

  // Prepare demo suggestions (with char positions) first
  const suggestions = useMemo(() => {
    const base: any[] = [
      { type: "spelling", word: "Thier", suggestion: "There" },
      { type: "spelling", word: "grammer", suggestion: "grammar" },
      { type: "grammar", word: "It help", suggestion: "It helps" },
      { type: "spelling", word: "colaborate", suggestion: "collaborate" },
    ]

    // Compute character ranges for each suggestion within sampleText
    return base.map((err) => {
      const start = sampleText.indexOf(err.word)
      const end = start + err.word.length
      return { ...err, start, end }
    })
  }, [])

  // We will highlight errors using the same ErrorHighlight extension as the main editor.
  const errorsRef = useRef<any[]>(suggestions)

  // Demo suggestions feed the highlight plugin via this ref
  const editor = useEditor({
    extensions: [StarterKit, ErrorHighlight.configure({ errorsRef })],
    content: sampleDoc,
    editable: false,
  })

  // Keep errorsRef synchronised so ErrorHighlight can access positions (in case of future re-renders)
  errorsRef.current = suggestions as any[]

  const wordCount = 19 // static for preview (matches sampleText)

  return (
    <Card className="p-0 overflow-hidden shadow-lg border-2 border-blue-100">
      <div style={{ height: "480px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <EditorHeader
          title="Demo Document"
          wordCount={wordCount}
          isTyping={false}
          isChecking={false}
          onClose={() => {}}
          onSave={() => {}}
          isSaving={false}
          status="academic"
          onStatusChange={() => {}}
        />

        {/* Toolbar (buttons are disabled for preview) */}
        <EditorToolbar
          selectedTone={null}
          setSelectedTone={() => {}}
          generateReadability={() => {}}
          isGeneratingReadability={false}
        />

        {/* Main content + sidebar */}
        <div style={{ ...styles.mainContent, flex: 1 }}>
          {/* Document area */}
          <div style={{ ...styles.documentArea, padding: "24px" }}>
            <div
              style={{
                ...styles.documentContainer,
                minHeight: "auto",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ ...styles.editorWrapper, maxWidth: "100%" }}>
                <EditorContent
                  editor={editor}
                  style={{ width: "100%", height: "100%", outline: "none", padding: "32px" }}
                />
              </div>
            </div>
          </div>

          {/* Suggestions sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarContent}>
              <div style={styles.sidebarSection}>
                <h3 style={styles.sectionTitle}>Document Suggestions</h3>
                <div style={styles.suggestionsContainer as any}>
                  {suggestions.map((err, idx) => (
                    <Card
                      key={idx}
                      style={{
                        ...styles.errorCard,
                        ...(err.type === "spelling"
                          ? styles.errorCardSpelling
                          : styles.errorCardGrammar),
                      }}
                    >
                      <CardContent style={styles.errorContent}>
                        <div style={styles.errorInner}>
                          <div
                            style={{
                              ...styles.errorIcon,
                              ...(err.type === "spelling" ? styles.spellingIcon : styles.grammarIcon),
                            }}
                          >
                            {err.type === "spelling" ? (
                              <Type className="h-3 w-3" />
                            ) : (
                              <PencilLine className="h-3 w-3" />
                            )}
                          </div>
                          <div style={styles.errorDetails}>
                            <p style={styles.errorTitle}>
                              {err.type === "spelling" ? `Spelling: "${err.word}"` : `Grammar`}
                            </p>
                            <p style={styles.errorSuggestion}>
                              Suggestion: <strong style={styles.suggestionText}>{err.suggestion}</strong>
                            </p>
                            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                              <Button variant="ghost" size="sm" disabled>
                                Accept
                              </Button>
                              <Button variant="ghost" size="sm" disabled>
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
    </Card>
  )
} 