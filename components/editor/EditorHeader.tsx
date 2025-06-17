import React from 'react'
import { ArrowLeft, Save, MoreHorizontal, Share, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { styles } from './styles'

interface EditorHeaderProps {
  title: string
  wordCount: number
  isTyping: boolean
  isChecking: boolean
  onClose: () => void
  onSave: () => void
  isSaving: boolean
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  wordCount,
  isTyping,
  isChecking,
  onClose,
  onSave,
  isSaving,
}) => {
  return (
    <div style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.headerLeft}>
          <Button variant="ghost" onClick={onClose} className="flex items-center space-x-2 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div style={styles.divider} />
          <div style={styles.titleContainer}>
            <h1 style={styles.title}>{title}</h1>
            <div style={styles.statsContainer}>
              <span style={styles.statItem}>
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span>{wordCount} words</span>
              </span>
              <span style={styles.statItem}>
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Last saved </span>
                <span>{isTyping ? 'typing...' : 'now'}</span>
              </span>
              <span style={styles.statItem}>
                {isChecking && (
                  <>
                    <div style={{ ...styles.spinner, height: '12px', width: '12px' }} />
                    <span style={{ color: '#2563eb' }}>Checking...</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center space-x-2"
            size="sm"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Share className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 