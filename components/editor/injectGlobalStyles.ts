/* Injects global CSS styles specific to the TextEditor instance.
 * We keep this in a dedicated helper so the main component stays lightweight.
 */
export function injectEditorGlobalStyles() {
  if (typeof document === 'undefined') return // SSR safeguard

  const id = 'text-editor-global-styles'
  if (document.getElementById(id)) return // already injected

  const styleSheet = document.createElement('style')
  styleSheet.id = id
  styleSheet.textContent = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .text-editor-content .ProseMirror {
      outline: none !important;
      min-height: 70vh;
      font-size: 1.125rem;
      line-height: 1.75;
      color: #374151;
      width: 100%;
      padding: 16px 6px 32px;
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
        padding: 24px 6px;
      }
    }
    @media (min-width: 1024px) {
      .text-editor-content .ProseMirror {
        padding: 32px 8px;
      }
    }
    .error-spelling { background-color: rgba(239, 68, 68, 0.3); }
    .error-grammar { background-color: rgba(234, 179, 8, 0.3); }
    .error-punctuation { background-color: rgba(37, 99, 235, 0.3); }
    .error-style { background-color: rgba(16, 185, 129, 0.3); }
  `
  document.head.appendChild(styleSheet)
} 