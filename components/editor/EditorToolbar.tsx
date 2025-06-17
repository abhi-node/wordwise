import React from 'react'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { styles } from './styles'

interface EditorToolbarProps {
  selectedTone: 'casual' | 'professional' | 'persuasive' | null
  setSelectedTone: (tone: 'casual' | 'professional' | 'persuasive' | null) => void
  generateReadability: () => void
  isGeneratingReadability: boolean
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedTone,
  setSelectedTone,
  generateReadability,
  isGeneratingReadability,
}) => {
  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarContent}>
        <div style={styles.toolbarGroup}>
          {(['casual', 'professional', 'persuasive'] as const).map((tone) => (
            <Button
              key={tone}
              variant={selectedTone === tone ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTone(selectedTone === tone ? null : tone)}
              className={
                selectedTone === tone ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }
            >
              {tone.charAt(0).toUpperCase() + tone.slice(1)}
            </Button>
          ))}

          {/* Readability button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={generateReadability}
            disabled={isGeneratingReadability}
            className="ml-2 text-gray-600 hover:text-gray-900"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 