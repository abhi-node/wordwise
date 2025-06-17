export const styles = {
  container: {
    position: 'fixed' as const,
    top: 0,
    left: 'var(--sidebar-width, 0px)',
    width: 'calc(100vw - var(--sidebar-width, 0px))',
    height: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  },
  mainCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    height: '100%'
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    zIndex: 50
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    minHeight: '64px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: 0
  },
  titleContainer: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '4px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap' as const
  },
  divider: {
    height: '24px',
    width: '1px',
    backgroundColor: '#d1d5db',
    display: 'block'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0
  },
  toolbar: {
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    zIndex: 40
  },
  toolbarContent: {
    display: 'flex',
    justifyContent: 'flex-start',
    padding: '12px 32px',
    overflowX: 'auto' as const
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 'max-content'
  },
  toolbarDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#d1d5db',
    margin: '0 12px'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    flexDirection: 'row' as const,
    overflow: 'hidden',
    minHeight: 0
  },
  documentArea: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '32px',
    minHeight: 0,
    height: '100%'
  },
  documentContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    minHeight: 'calc(100vh - 200px)',
    display: 'flex',
    justifyContent: 'center'
  },
  editorWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: '850px',
    height: '100%',
    minHeight: '100%'
  },
  sidebar: {
    width: '320px',
    height: '100%',
    backgroundColor: '#f9fafb',
    borderLeft: '1px solid #e5e7eb',
    overflowY: 'auto' as const,
    flexShrink: 0
  },
  sidebarContent: {
    padding: '24px'
  },
  sidebarSection: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontWeight: 600,
    color: '#111827',
    marginBottom: '16px',
    fontSize: '1rem'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#111827'
  },
  statValueSmall: {
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  issuesValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  badge: {
    marginLeft: '8px',
    fontSize: '0.75rem'
  },
  dateText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '4px'
  },
  suggestionsContainer: {
    maxHeight: '384px',
    overflowY: 'auto' as const
  },
  noIssues: {
    textAlign: 'center' as const,
    padding: '32px'
  },
  noIssuesTitle: {
    marginTop: '8px',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937'
  },
  noIssuesText: {
    marginTop: '4px',
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  checking: {
    textAlign: 'center' as const,
    padding: '32px'
  },
  checkingText: {
    marginTop: '8px',
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  errorCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    marginBottom: '16px'
  },
  errorContent: {
    padding: '16px'
  },
  errorInner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  errorIcon: {
    height: '32px',
    width: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  spellingIcon: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  grammarIcon: {
    backgroundColor: '#fef3c7',
    color: '#d97706'
  },
  punctuationIcon: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  styleIcon: {
    backgroundColor: '#d1fae5',
    color: '#059669'
  },
  errorCardSpelling: {
    backgroundColor: 'rgba(254,226,226,0.5)',
  },
  errorCardGrammar: {
    backgroundColor: 'rgba(254,243,199,0.5)',
  },
  errorCardPunctuation: {
    backgroundColor: 'rgba(219,234,254,0.5)',
  },
  errorCardStyle: {
    backgroundColor: 'rgba(209, 250, 229, 0.5)',
  },
  errorDetails: {
    flex: 1,
    minWidth: 0
  },
  errorTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1f2937',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  errorSuggestion: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '4px'
  },
  suggestionText: {
    fontWeight: 700,
    color: '#059669'
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    borderRadius: '50%',
    border: '2px solid #e5e7eb',
    borderTopColor: '#2563eb'
  },
  loadingContainer: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContent: {
    textAlign: 'center' as const
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
    borderRadius: '50%',
    height: '48px',
    width: '48px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#2563eb',
    margin: '0 auto 16px'
  },
  loadingText: {
    color: '#6b7280'
  },
  feedbackText: {
    fontSize: '0.875rem',
    color: '#374151',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.5,
  }
} 