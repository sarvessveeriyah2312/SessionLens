import React, { useState } from 'react'
import type { SessionState } from '../../../electron/types'
import Timeline from '../Timeline'

const STATUS_CONFIG: Record<string, {
  label: string
  gradient: string
  dotColor: string
}> = {
  active: {
    label: 'ACTIVE',
    gradient: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    dotColor: 'bg-emerald-500'
  },
  idle: {
    label: 'IDLE',
    gradient: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    dotColor: 'bg-amber-500'
  },
  exited: {
    label: 'EXITED',
    gradient: 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    dotColor: 'bg-gray-500'
  },
  completed: {
    label: 'DONE',
    gradient: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    dotColor: 'bg-blue-500'
  }
}

// Utility functions
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Sparkline with gradient bars
function Sparkline({ data }: { data: number[] }): React.JSX.Element {
  const max = Math.max(...data, 1)
  const height = 28
  const width = Math.min(data.length * 6, 200)

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00f5ff" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {data.map((val, i) => {
        const barH = Math.max(3, (val / max) * height)
        const y = height - barH
        const x = i * 6
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={4}
            height={barH}
            rx={2}
            fill="url(#sparklineGradient)"
            className="transition-all duration-300"
          />
        )
      })}
    </svg>
  )
}

// Notes Modal - Redesigned
function NotesModal({ 
  sessionId, 
  initialNote, 
  onClose, 
  onSave 
}: { 
  sessionId: string
  initialNote: string
  onClose: () => void
  onSave: (note: string) => void
}): React.JSX.Element {
  const [note, setNote] = useState(initialNote)

  const handleSave = (): void => {
    window.api?.addNote(sessionId, note).then(() => {
      onSave(note)
      onClose()
    }).catch(() => {
      onSave(note)
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#2a2d38] rounded-2xl p-5 w-96 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Session Notes</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your thoughts, observations, or important context..."
          rows={6}
          className="w-full bg-[#0a0c12] border border-[#252a38] rounded-xl p-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 resize-none transition-all"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/40 rounded-xl hover:from-[#00f5ff]/30 hover:to-[#00a3cc]/30 transition-all"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}

// Tag Input - Redesigned
function TagInput({ 
  sessionId, 
  currentTags, 
  onTagsChange, 
  onClose 
}: { 
  sessionId: string
  currentTags: string[]
  onTagsChange: (tags: string[]) => void
  onClose: () => void
}): React.JSX.Element {
  const [input, setInput] = useState('')

  const addTag = (): void => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || currentTags.includes(tag)) return
    window.api?.addTag(sessionId, tag).then((res) => {
      if (res.tags) onTagsChange(res.tags)
    }).catch(() => {
      onTagsChange([...currentTags, tag])
    })
    setInput('')
    onClose()
  }

  const removeTag = (tag: string): void => {
    window.api?.removeTag(sessionId, tag).then((res) => {
      if (res.tags) onTagsChange(res.tags)
    }).catch(() => {
      onTagsChange(currentTags.filter((t) => t !== tag))
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#2a2d38] rounded-2xl p-5 w-96 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Manage Tags</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add a tag (e.g., feature, bugfix, research)..."
            className="flex-1 bg-[#0a0c12] border border-[#252a38] rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 transition-all"
            autoFocus
          />
          <button
            onClick={addTag}
            className="px-3 py-2 text-sm bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/40 rounded-xl hover:from-[#00f5ff]/30 hover:to-[#00a3cc]/30 transition-all"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <span 
              key={tag} 
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1e2c] border border-[#2a2f42] rounded-full text-xs text-[#b9c3f0] hover:border-[#00f5ff]/40 transition-all"
            >
              <span>#</span>
              <span>{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 text-gray-500 hover:text-[#ff6b6b] transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {currentTags.length === 0 && (
            <span className="text-xs text-gray-600 italic">No tags yet. Add some to organize your sessions!</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Metric Item - Enhanced
function MetricItem({ 
  label, 
  value, 
  highlight, 
  tooltip 
}: { 
  label: string
  value: string
  highlight?: boolean
  tooltip?: string
}): React.JSX.Element {
  return (
    <div className="group relative flex items-center gap-1.5">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      <span
        className={`text-xs font-mono font-medium ${highlight ? 'text-[#00f5ff]' : 'text-gray-300'}`}
      >
        {value}
      </span>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-gray-800 text-[10px] text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  )
}

// Main SessionCard Component - Redesigned
export default function SessionCard({
  session,
  onSelect
}: {
  session: SessionState
  onSelect?: (session: SessionState) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [tags, setTags] = useState(session.tags)
  const [note, setNote] = useState(session.note)

  // Sync from props
  React.useEffect(() => {
    setTags(session.tags)
    setNote(session.note)
  }, [session.tags, session.note])

  const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.exited
  const visibleTags = tags.slice(0, 3)
  const hiddenTagCount = tags.length - visibleTags.length

  return (
    <>
      <div
        className={`
          group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer
          bg-gradient-to-br from-[#111217] to-[#0c0e16]
          border border-[#252a38] hover:border-[#00f5ff]/50
          hover:shadow-xl hover:shadow-[#00f5ff]/5
          hover:translate-x-1
        `}
        onClick={() => onSelect?.(session)}
      >
        {/* Animated gradient border on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00f5ff]/0 via-[#00f5ff]/10 to-[#00f5ff]/0" />
        </div>

        <div className="relative p-4">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Animated status dot */}
              <div className="relative">
                <div 
                  className={`w-2.5 h-2.5 rounded-full ${status.dotColor} shadow-lg`}
                />
                {session.status === 'active' && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500 opacity-40" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white truncate text-base">
                    {session.projectName}
                  </h3>
                  <div className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                    bg-gradient-to-r ${status.gradient} border
                  `}>
                    {status.label}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-gray-500 truncate">
                    {session.projectPath}
                  </span>
                </div>
              </div>
            </div>

            {/* Duration Badge */}
            <div className="flex-shrink-0 bg-[#0a0c12] px-2.5 py-1 rounded-full border border-[#252a38]">
              <span className="text-xs font-mono text-gray-400">
                {formatDuration(session.runtimeSeconds)}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="flex flex-wrap items-center gap-4 mb-3 pb-2 border-b border-[#1a1e2a]">
            <MetricItem label="CPU" value={`${session.cpu.toFixed(1)}%`}  />
            <MetricItem label="MEM" value={`${session.memory} MB`}  />
            <MetricItem 
              label="COST" 
              value={`$${session.costUsd.toFixed(4)}`} 
              highlight 
            />
            <MetricItem label="↑" value={formatTokens(session.tokensInput)}  />
            <MetricItem label="↓" value={formatTokens(session.tokensOutput)} />
            <MetricItem label="MODEL" value={session.model.replace('claude-', '')} />
          </div>

          {/* Tags & Sparkline Section */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* Sparkline with label */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600">Activity</span>
                <Sparkline data={session.sparklineData} />
              </div>
              
              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {visibleTags.map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a1e2c] rounded-full text-[10px] text-[#b9c3f0] border border-[#2a2f42]"
                  >
                    <span>#</span>
                    {tag}
                  </span>
                ))}
                {hiddenTagCount > 0 && (
                  <span className="text-[10px] text-gray-500 bg-[#1a1e2c] px-2 py-0.5 rounded-full">
                    +{hiddenTagCount}
                  </span>
                )}
                {tags.length === 0 && (
                  <span className="text-[10px] text-gray-600 italic">no tags</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowNotes(true)}
                className={`
                  group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${note 
                    ? 'bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30' 
                    : 'text-gray-500 hover:text-white hover:bg-[#1a1e2c]'
                  }
                `}
              >
                <span>Notes</span>
                {note && <span className="w-1.5 h-1.5 rounded-full bg-[#00f5ff] animate-pulse" />}
              </button>
              
              <button
                onClick={() => setShowTags(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-white hover:bg-[#1a1e2c] transition-all duration-200"
              >
                <span>Tag</span>
              </button>
              
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#00f5ff] hover:bg-[#1a1e2c] transition-all duration-200"
              >
                <span className={`transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
                <span>Timeline</span>
              </button>
            </div>
          </div>

          {/* Note Preview */}
          {note && (
            <div className="mt-3 pt-2 border-t border-[#1a1e2a]">
              <p className="text-xs text-gray-400 italic line-clamp-2">{note}</p>
            </div>
          )}
        </div>

        {/* Expanded Timeline Section */}
        {expanded && (
          <div className="border-t border-[#1a1e2a] bg-gradient-to-b from-[#0a0c12] to-[#080a10] p-4">
            <Timeline sessionId={session.id} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showNotes && (
        <NotesModal
          sessionId={session.id}
          initialNote={note}
          onClose={() => setShowNotes(false)}
          onSave={setNote}
        />
      )}

      {showTags && (
        <TagInput
          sessionId={session.id}
          currentTags={tags}
          onTagsChange={setTags}
          onClose={() => setShowTags(false)}
        />
      )}
    </>
  )
}