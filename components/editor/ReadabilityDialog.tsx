import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ReadabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  readabilityScore: number | null
}

// Utility: interpolate between two colors (given as [r,g,b])
const lerpColor = (c1: number[], c2: number[], t: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// Map score -> smooth gradient color across hidden subdivisions (<25 red → <50 orange → <75 yellow → <100 green)
const getReadabilityColor = (score: number): string => {
  // Clamp
  const pct = Math.max(0, Math.min(100, score))

  // Define stops
  const stops: { pct: number; color: number[] }[] = [
    { pct: 0, color: [239, 68, 68] },   // #ef4444 (red)
    { pct: 25, color: [249, 115, 22] }, // #f97316 (orange)
    { pct: 50, color: [250, 204, 21] }, // #facc15 (yellow)
    { pct: 75, color: [234, 179, 8] },  // slightly deeper yellow-green #eab308 to transition
    { pct: 100, color: [34, 197, 94] }, // #22c55e (green)
  ]

  // Find surrounding stops
  let lower = stops[0]
  let upper = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].pct && pct <= stops[i + 1].pct) {
      lower = stops[i]
      upper = stops[i + 1]
      break
    }
  }

  const range = upper.pct - lower.pct
  const t = range === 0 ? 0 : (pct - lower.pct) / range

  return lerpColor(lower.color, upper.color, t)
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
                style={{
                  height: '100%',
                  width: `${readabilityScore}%`,
                  background: getReadabilityColor(readabilityScore),
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 