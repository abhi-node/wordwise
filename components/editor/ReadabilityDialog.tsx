import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ReadabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  readabilityMetrics: {
    readability: number
    clarity: number
    conciseness: number
  } | null
}

// Utility: interpolate between two colors (given as [r,g,b])
const lerpColor = (c1: number[], c2: number[], t: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// Map score -> smooth gradient color where 0% is red, 50% yellow, 100% green
const getReadabilityColor = (score: number): string => {
  // Clamp
  const pct = Math.max(0, Math.min(100, score))

  // Define stops
  const stops: { pct: number; color: number[] }[] = [
    { pct: 0, color: [239, 68, 68] },   // #ef4444 (red)
    { pct: 50, color: [250, 204, 21] }, // #facc15 (yellow)
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

// Circular meter component
const CircularMeter: React.FC<{ value: number; size?: number }> = ({ value, size = 72 }) => {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, value))
  const offset = circumference * (1 - pct / 100)
  const color = getReadabilityColor(pct)

  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="0.75rem"
        fontWeight={600}
        fill="#374151"
      >
        {pct}%
      </text>
    </svg>
  )
}

export const ReadabilityDialog: React.FC<ReadabilityDialogProps> = ({ open, onOpenChange, readabilityMetrics }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: '380px', width: '90%' }}>
        <DialogHeader>
          <DialogTitle>Coherence Metrics</DialogTitle>
        </DialogHeader>
        {readabilityMetrics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(
              [
                { label: 'Readability', value: readabilityMetrics.readability },
                { label: 'Clarity', value: readabilityMetrics.clarity },
                { label: 'Conciseness', value: readabilityMetrics.conciseness },
              ] as const
            ).map((m) => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <CircularMeter value={m.value} />
                <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 