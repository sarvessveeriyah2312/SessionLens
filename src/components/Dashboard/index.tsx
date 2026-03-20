import React, { useState, useEffect, useRef, useCallback } from 'react'
import SessionCard from './SessionCard'
import type { SessionState } from '../../../electron/types'


export default function Dashboard({
  onSelectSession
}: {
  onSelectSession?: (session: SessionState) => void
} = {}): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionState[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await window.api?.getSessions()
      if (data) setSessions(data)
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()

    const unsubscribe = window.api?.onSessionsUpdate((updated) => {
      setSessions(updated)
    })

    const handleKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      // Escape key to clear search
      if (e.key === 'Escape' && search) {
        setSearch('')
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      unsubscribe?.()
      window.removeEventListener('keydown', handleKey)
    }
  }, [loadSessions, search])

  const filtered = sessions.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchSearch =
      !search ||
      s.projectName.toLowerCase().includes(search.toLowerCase()) ||
      s.projectPath.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  const totals = sessions.reduce(
    (acc, s) => ({
      cost: acc.cost + s.costUsd,
      tokens: acc.tokens + s.tokensInput + s.tokensOutput,
      activeSessions: acc.activeSessions + (s.status === 'active' ? 1 : 0)
    }),
    { cost: 0, tokens: 0, activeSessions: 0 }
  )

  const statusCounts = sessions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const STATUS_FILTERS = [
    { value: 'all', label: 'All', color: 'text-gray-400' },
    { value: 'active', label: 'Active', color: 'text-emerald-400' },
    { value: 'idle', label: 'Idle', color: 'text-amber-400' },
    { value: 'exited', label: 'Exited', color: 'text-rose-400' }
  ]

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0f] to-[#050507]">
      {/* Header with gradient border */}
      <div className="relative px-6 pt-6 pb-4 flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f5ff] to-transparent opacity-50" />
        <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Claude Sessions
        </h1>
        <p className="text-xs text-gray-500 mt-1">Monitor and manage your AI coding sessions</p>
      </div>

      {/* Stats Grid - Modern card design */}
      <div className="grid grid-cols-4 gap-3 px-6 mb-4 flex-shrink-0">
        <StatCard
          label="Active"
          value={totals.activeSessions}
          trend={totals.activeSessions > 0 ? 'running' : 'idle'}
          color="emerald"
        />
        <StatCard
          label="Total Sessions"
          value={sessions.length}
          color="gray"
        />
        <StatCard
          label="Total Cost"
          value={`$${totals.cost.toFixed(2)}`}
          subtext={totals.cost > 0 ? 'estimated' : ''}
          color="cyan"
        />
        <StatCard
          label="Total Tokens"
          value={formatTokens(totals.tokens)}
          subtext={`${formatNumber(totals.tokens)} tokens`}
          color="gray"
        />
      </div>

      {/* Filter Bar - Redesigned */}
      <div className="flex items-center gap-4 px-6 py-3 border-y border-[#1a1c24] bg-[#0c0d12]/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex gap-1 bg-[#111217] rounded-xl p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`
                relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${statusFilter === f.value
                  ? 'text-white bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 shadow-lg'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c24]'
                }
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                {f.label}
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full font-mono
                  ${statusFilter === f.value 
                    ? 'bg-white/10 text-white' 
                    : 'bg-[#1a1c24] text-gray-400'
                  }
                `}>
                  {f.value === 'all' ? sessions.length : (statusCounts[f.value] || 0)}
                </span>
              </span>
              {statusFilter === f.value && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00f5ff]/10 to-transparent" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, path, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              bg-[#111217] border border-[#20232c] rounded-xl px-3 pr-8 py-2
              text-sm text-gray-200 placeholder:text-gray-600
              focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30
              transition-all w-72
            "
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-[#00f5ff]/20 border-t-[#00f5ff] rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-500">Loading sessions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasSessions={sessions.length > 0} />
        ) : (
          <div className="space-y-2">
            {filtered.map((session) => (
              <SessionCard 
                key={session.id} 
                session={session} 
                onSelect={onSelectSession}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Stat Card Component
function StatCard({
  label,
  value,
  subtext,
  trend,
  color = 'gray'
}: {
  label: string
  value: string | number
  subtext?: string
  trend?: string
  color?: 'emerald' | 'cyan' | 'gray' | 'amber' | 'rose'
}) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    gray: 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30'
  }
  
  const textColors = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    gray: 'text-gray-300',
    amber: 'text-amber-400',
    rose: 'text-rose-400'
  }

  return (
    <div className={`
      relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]}
      border backdrop-blur-sm p-3 transition-all hover:scale-[1.02] hover:border-opacity-50
    `}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
      {subtext && <p className="text-[10px] text-gray-600 mt-1">{subtext}</p>}
      {trend && (
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-600">
          {trend === 'running' ? '● Live' : '○ Inactive'}
        </div>
      )}
    </div>
  )
}

// Empty State Component
function EmptyState({ hasSessions }: { hasSessions: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-gray-400 font-medium">
        {hasSessions ? 'No matching sessions' : 'No Claude sessions detected'}
      </p>
      <p className="text-xs text-gray-600 mt-2 max-w-sm text-center">
        {hasSessions
          ? 'Try adjusting your filters or search query'
          : 'Start a Claude Code session to see it appear here'}
      </p>
    </div>
  )
}

// Utility functions
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}