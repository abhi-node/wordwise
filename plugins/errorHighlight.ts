import React from 'react'
import { Plugin, PluginKey, EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Extension } from '@tiptap/core'
import { posFromCharIndex } from '@/lib/editorUtils'
import type { TextError } from '@/lib/editorUtils'

export const highlightPluginKey = new PluginKey('error-highlight')

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
            decorations.push(Decoration.inline(from, to, { class: `error-${err.type}` }))
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

export default ErrorHighlight 