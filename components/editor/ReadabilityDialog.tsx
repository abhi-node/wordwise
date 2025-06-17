import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ReadabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  readabilityScore: number | null
}

export const ReadabilityDialog: React.FC<ReadabilityDialogProps> = ({ open, onOpenChange, readabilityScore }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Readability Score</DialogTitle>
        </DialogHeader>
        {readabilityScore !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
              Overall readability: {readabilityScore}%
            </div>
            <div
              style={{
                height: '12px',
                width: '100%',
                background: '#e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{ height: '100%', width: `${readabilityScore}%`, background: '#2563eb' }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 