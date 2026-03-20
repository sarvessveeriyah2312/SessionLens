import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

interface HistorySession {
  id: string
  pid: number
  project_name: string
  project_path: string
  status: string
  start_time: number
  last_activity: number
  model: string
  cost_usd: number
  tokens_input: number
  tokens_output: number
  tokens_cache: number
  created_at: string
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function formatDuration(startMs: number, lastMs: number): string {
  const diff = Math.floor((lastMs - startMs) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
}> = {
  active: {
    label: 'ACTIVE',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.1)'
  },
  idle: {
    label: 'IDLE',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.1)'
  },
  exited: {
    label: 'EXITED',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.1)'
  },
  completed: {
    label: 'DONE',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)'
  }
}

// ── Table Row Component ─────────────────────────────────────────────────────

function HistoryRow({ session }: { session: HistorySession }): React.JSX.Element {
  const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.exited
  const totalTokens = session.tokens_input + session.tokens_output
  const startDate = new Date(session.start_time)
  const isRecent = (Date.now() - session.start_time) < 24 * 60 * 60 * 1000

  return (
    <tr className="group border-b border-[#1a1e2a] hover:bg-[#12141c] transition-all duration-200">
      {/* Project */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium text-white text-sm">{session.project_name}</div>
            <div className="text-[11px] text-gray-600 font-mono flex items-center gap-1">
              <span className="truncate max-w-[200px]">{session.project_path}</span>
              {isRecent && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3">
        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
             style={{ backgroundColor: status.bg, color: status.color }}>
          {status.label}
        </div>
      </td>

      {/* Started */}
      <td className="px-5 py-3">
        <div className="text-sm text-gray-400">
          {format(startDate, 'MMM d, yyyy')}
        </div>
        <div className="text-[11px] text-gray-600 font-mono">
          {format(startDate, 'HH:mm:ss')}
        </div>
      </td>

      {/* Duration */}
      <td className="px-5 py-3">
        <span className="text-sm font-mono text-gray-300">
          {formatDuration(session.start_time, session.last_activity)}
        </span>
      </td>

      {/* Cost */}
      <td className="px-5 py-3 text-right">
        <div className="text-base font-bold font-mono text-[#00f5ff]">
          ${session.cost_usd.toFixed(3)}
        </div>
        <div className="text-[10px] text-gray-600">
          total spent
        </div>
      </td>

      {/* Tokens */}
      <td className="px-5 py-3 text-right">
        <div className="text-sm font-mono text-gray-300">
          {formatTokens(totalTokens)}
        </div>
        <div className="flex gap-2 justify-end text-[10px] text-gray-600 mt-0.5">
          <span>↑ {formatTokens(session.tokens_input)}</span>
          <span>↓ {formatTokens(session.tokens_output)}</span>
        </div>
      </td>

      {/* Model */}
      <td className="px-5 py-3">
        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1a1e2c] border border-[#2a2f42]">
          <span className="text-xs text-gray-300 font-mono">
            {session.model.replace('claude-', '').replace('-4-6', '').replace('-4-5', '')}
          </span>
        </div>
      </td>
    </tr>
  )
}

// ── Stat Summary Component ──────────────────────────────────────────────────

function SummaryStats({ sessions }: { sessions: HistorySession[] }): React.JSX.Element {
  const totalCost = sessions.reduce((sum, s) => sum + s.cost_usd, 0)
  const totalTokens = sessions.reduce((sum, s) => sum + s.tokens_input + s.tokens_output, 0)
  const uniqueProjects = new Set(sessions.map(s => s.project_name)).size
  const avgCostPerSession = sessions.length > 0 ? totalCost / sessions.length : 0

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Sessions</div>
        <div className="text-xl font-bold text-white">{sessions.length}</div>
        <div className="text-[10px] text-gray-600 mt-1">{uniqueProjects} projects</div>
      </div>
      <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Cost</div>
        <div className="text-xl font-bold text-[#00f5ff]">${totalCost.toFixed(2)}</div>
        <div className="text-[10px] text-gray-600 mt-1">avg ${avgCostPerSession.toFixed(2)}/session</div>
      </div>
      <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Tokens</div>
        <div className="text-xl font-bold text-white">{formatTokens(totalTokens)}</div>
        <div className="text-[10px] text-gray-600 mt-1">input/output combined</div>
      </div>
      <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Models Used</div>
        <div className="text-xl font-bold text-white">
          {new Set(sessions.map(s => s.model)).size}
        </div>
        <div className="text-[10px] text-gray-600 mt-1">across all sessions</div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function History(): React.JSX.Element {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [exportMsg, setExportMsg] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api?.getHistory()
      if (data) setSessions(data as HistorySession[])
    } catch {
      // Use empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = sessions.filter((s) => {
    if (!search) return true
    return (
      s.project_name.toLowerCase().includes(search.toLowerCase()) ||
      s.project_path.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase()) ||
      s.model.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleExport = async (): Promise<void> => {
    try {
      const csv = await window.api?.exportCsv()
      if (!csv) return

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sessionlens-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('Exported!')
      setTimeout(() => setExportMsg(''), 2000)
    } catch {
      setExportMsg('Export failed')
      setTimeout(() => setExportMsg(''), 2000)
    }
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filtered.map(s => s.id)))
    }
  }

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedRows(newSet)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0f] to-[#050507]">
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5ff]/50 to-transparent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Session History
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Browse and analyze past Claude Code sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 bg-[#12141c] px-3 py-1.5 rounded-lg border border-[#252a38]">
              {sessions.length} total sessions
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && sessions.length > 0 && (
        <div className="px-6">
          <SummaryStats sessions={sessions} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-y border-[#252a38] bg-[#0c0e16]/50 backdrop-blur-sm flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search by project, path, status, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0c12] border border-[#252a38] rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex-1" />

        {filtered.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {selectedRows.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        )}

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/40 rounded-xl hover:from-[#00f5ff]/30 hover:to-[#00a3cc]/30 transition-all"
        >
          {exportMsg || 'Export CSV'}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-[#00f5ff]/20 border-t-[#00f5ff] rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-600">Loading session history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="text-sm text-gray-500 font-medium">
              {sessions.length === 0 ? 'No session history yet' : 'No matching sessions'}
            </div>
            <div className="text-xs text-gray-600 max-w-sm text-center">
              {sessions.length === 0 
                ? 'Start using Claude Code to see your session history here' 
                : 'Try adjusting your search query to find what you\'re looking for'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0c0e16] backdrop-blur-sm">
                <tr className="border-b border-[#252a38]">
                  <th className="px-5 py-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#2a2f42] bg-[#0a0c12] accent-[#00f5ff]"
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((session) => (
                  <HistoryRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#252a38] bg-[#0c0e16]/50 text-xs flex-shrink-0">
          <div className="text-gray-500">
            Showing {filtered.length} of {sessions.length} sessions
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total cost:</span>
              <span className="font-mono text-[#00f5ff]">
                ${filtered.reduce((sum, s) => sum + s.cost_usd, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total tokens:</span>
              <span className="font-mono text-white">
                {formatTokens(filtered.reduce((sum, s) => sum + s.tokens_input + s.tokens_output, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}