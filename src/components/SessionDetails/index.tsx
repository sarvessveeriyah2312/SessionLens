import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import type { SessionState, TimelineEvent } from '../../../electron/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  idle: '#eab308',
  exited: '#6b7280',
  completed: '#3b82f6'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

type TimeWindow = '1h' | '6h' | '24h'
const WINDOW_HOURS: Record<TimeWindow, number> = { '1h': 1, '6h': 6, '24h': 24 }

// ── Timeline chart (reused from Timeline/index but larger) ───────────────────

interface ChartPoint {
  time: string
  tokens: number
  state: string
  isAnnotation?: boolean
  annotationText?: string
}

function buildChartData(events: TimelineEvent[]): ChartPoint[] {
  const samples = events.filter((e) => e.eventType === 'token_sample')
  const annotations = events.filter((e) => e.eventType === 'annotation')
  const exitEvents = events.filter((e) => e.eventType === 'state_change' && e.state === 'exited')

  const points: ChartPoint[] = []
  for (let i = 0; i < samples.length; i++) {
    const cur = samples[i]
    const prev = samples[i - 1]
    const delta = prev
      ? (cur.tokensOutput) - (prev.tokensOutput)
      : cur.tokensOutput

    const timeStr = format(parseISO(cur.timestamp), 'HH:mm')
    const annotation = annotations.find((a) => {
      return Math.abs(new Date(a.timestamp).getTime() - new Date(cur.timestamp).getTime()) < 60_000
    })

    points.push({
      time: timeStr,
      tokens: Math.max(0, delta),
      state: cur.state,
      isAnnotation: !!annotation,
      annotationText: annotation?.annotationText
    })
  }
  return points
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartPoint }>
  label?: string
}

function ChartTooltip({ active, payload, label }: TooltipProps): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2 text-xs shadow-lg">
      <div className="text-[#a0a0a0] mb-1">{label}</div>
      <div className="text-white">
        Output tokens: <span className="text-[#00f5ff] font-mono">{payload[0].value.toLocaleString()}</span>
      </div>
      <div className="text-[#606060] capitalize">State: {d.state}</div>
      {d.annotationText && (
        <div className="text-[#eab308] mt-1 max-w-[220px] whitespace-normal">{d.annotationText}</div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[10px] text-[#606060] uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-semibold font-mono ${accent ? 'text-[#00f5ff]' : 'text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-[#404040]">{sub}</span>}
    </div>
  )
}

function TokenBar({
  label,
  value,
  total,
  color
}: {
  label: string
  value: number
  total: number
  color: string
}): React.JSX.Element {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-xs text-[#a0a0a0] text-right flex-shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-[#111] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-16 text-xs font-mono text-[#a0a0a0] flex-shrink-0">{fmt(value)}</div>
      <div className="w-10 text-xs font-mono text-[#606060] flex-shrink-0">{pct.toFixed(1)}%</div>
    </div>
  )
}

// ── Notes editor ──────────────────────────────────────────────────────────────

function NotesEditor({
  sessionId,
  initialNote
}: {
  sessionId: string
  initialNote: string
}): React.JSX.Element {
  const [note, setNote] = useState(initialNote)
  const [saved, setSaved] = useState(true)

  useEffect(() => setNote(initialNote), [initialNote])

  const save = useCallback(() => {
    window.api?.addNote(sessionId, note).catch(() => {})
    setSaved(true)
  }, [sessionId, note])

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#606060] uppercase tracking-wider">Notes</span>
        {!saved && (
          <button
            onClick={save}
            className="text-[10px] text-[#00f5ff] border border-[rgba(0,245,255,0.3)] px-2 py-0.5 rounded hover:bg-[rgba(0,245,255,0.1)]"
          >
            Save
          </button>
        )}
        {saved && note && (
          <span className="text-[10px] text-[#404040]">Saved</span>
        )}
      </div>
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false) }}
        onBlur={save}
        placeholder="Add session notes..."
        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded p-2 text-xs text-white placeholder-[#303030] focus:outline-none focus:border-[rgba(0,245,255,0.4)] resize-none min-h-[80px]"
      />
    </div>
  )
}

// ── Tags panel ────────────────────────────────────────────────────────────────

function TagsPanel({
  sessionId,
  initialTags
}: {
  sessionId: string
  initialTags: string[]
}): React.JSX.Element {
  const [tags, setTags] = useState(initialTags)
  const [input, setInput] = useState('')

  useEffect(() => setTags(initialTags), [initialTags])

  const add = (): void => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32)
    if (!tag || tags.includes(tag)) { setInput(''); return }
    window.api?.addTag(sessionId, tag).then((res) => {
      if (res.tags) setTags(res.tags)
      else setTags([...tags, tag])
    }).catch(() => setTags([...tags, tag]))
    setInput('')
  }

  const remove = (tag: string): void => {
    window.api?.removeTag(sessionId, tag).then((res) => {
      if (res.tags) setTags(res.tags)
      else setTags(tags.filter((t) => t !== tag))
    }).catch(() => setTags(tags.filter((t) => t !== tag)))
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex flex-col gap-3 h-full">
      <span className="text-xs text-[#606060] uppercase tracking-wider">Tags</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add tag..."
          className="flex-1 bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white placeholder-[#303030] focus:outline-none focus:border-[rgba(0,245,255,0.4)]"
        />
        <button
          onClick={add}
          className="px-3 py-1 text-xs bg-[rgba(0,245,255,0.1)] text-[#00f5ff] border border-[rgba(0,245,255,0.25)] rounded hover:bg-[rgba(0,245,255,0.2)]"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-xs bg-[rgba(0,245,255,0.08)] text-[#00c8d4] border border-[rgba(0,245,255,0.2)] rounded-full px-2.5 py-1"
          >
            #{tag}
            <button
              onClick={() => remove(tag)}
              className="text-[#00a0aa] hover:text-white leading-none ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-[#303030]">No tags yet</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessionDetails({
  session: initialSession,
  onBack
}: {
  session: SessionState
  onBack: () => void
}): React.JSX.Element {
  const [session, setSession] = useState(initialSession)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1h')
  const [tlLoading, setTlLoading] = useState(false)

  // Keep session data live
  useEffect(() => {
    const unsub = window.api?.onSessionsUpdate((updated) => {
      const found = updated.find((s) => s.id === session.id)
      if (found) setSession(found)
    })
    return () => unsub?.()
  }, [session.id])

  // Timeline data
  const loadTimeline = useCallback(async () => {
    setTlLoading(true)
    try {
      const data = await window.api?.getTimeline(session.id, WINDOW_HOURS[timeWindow])
      if (data) setEvents(data)
    } catch { /* silent */ }
    finally { setTlLoading(false) }
  }, [session.id, timeWindow])

  useEffect(() => {
    loadTimeline()
    const iv = setInterval(loadTimeline, 30_000)
    return () => clearInterval(iv)
  }, [loadTimeline])

  const statusColor = STATUS_COLORS[session.status] ?? '#6b7280'
  const chartData = buildChartData(events)
  const exitPoints = events.filter((e) => e.eventType === 'state_change' && e.state === 'exited')
  const annotationPoints = chartData.filter((p) => p.isAnnotation)

  const totalTokens = session.tokensInput + session.tokensOutput + session.tokensCache
  const cacheEfficiency = totalTokens > 0 ? (session.tokensCache / totalTokens) * 100 : 0

  // Donut data
  const donutData = [
    { name: 'Input', value: session.tokensInput, color: '#3b82f6' },
    { name: 'Output', value: session.tokensOutput, color: '#00f5ff' },
    { name: 'Cache', value: session.tokensCache, color: '#a855f7' }
  ].filter((d) => d.value > 0)

  const startDate = new Date(session.startTime)

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-hidden">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border-b border-[#2a2a2a] flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#222]"
        >
          <span>←</span>
          <span>Dashboard</span>
        </button>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        {/* Status dot */}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${session.status === 'active' ? 'status-dot-active' : ''}`}
          style={{ backgroundColor: statusColor }}
        />

        {/* Name */}
        <span className="text-sm font-semibold text-white">{session.projectName}</span>

        {/* Status badge */}
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`
          }}
        >
          {session.status.toUpperCase()}
        </span>

        <div className="flex-1" />

        {/* Model */}
        <span className="text-xs text-[#606060] font-mono">{session.model}</span>

        {/* Runtime */}
        <span className="text-xs text-[#404040] font-mono">
          {fmtDuration(session.runtimeSeconds)}
        </span>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Stat cards row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Cost" value={`$${session.costUsd.toFixed(4)}`} accent />
          <StatCard
            label="Input tokens"
            value={fmt(session.tokensInput)}
            sub="prompt + context"
          />
          <StatCard
            label="Output tokens"
            value={fmt(session.tokensOutput)}
            sub="generated"
          />
          <StatCard
            label="Cache tokens"
            value={fmt(session.tokensCache)}
            sub={`${cacheEfficiency.toFixed(1)}% efficiency`}
          />
          <StatCard
            label="Process"
            value={`${session.cpu.toFixed(1)}%`}
            sub={`${session.memory} MB · PID ${session.pid}`}
          />
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Token Activity Timeline
            </span>
            <div className="flex gap-1">
              {(['1h', '6h', '24h'] as TimeWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setTimeWindow(w)}
                  className={`px-2.5 py-1 text-xs rounded transition-all ${
                    timeWindow === w
                      ? 'bg-[rgba(0,245,255,0.15)] text-[#00f5ff] border border-[rgba(0,245,255,0.3)]'
                      : 'text-[#606060] hover:text-[#a0a0a0] border border-[#2a2a2a]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {tlLoading ? (
            <div className="h-40 flex items-center justify-center text-[#404040] text-xs">
              Loading timeline…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#404040] text-xs flex-col gap-2">
              <span className="text-2xl">◌</span>
              <span>No activity data for this window</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                barSize={8}
                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#1f1f1f" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#404040' }}
                  axisLine={{ stroke: '#2a2a2a' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#404040' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                {exitPoints.map((ep, i) => (
                  <ReferenceLine
                    key={`exit-${i}`}
                    x={format(parseISO(ep.timestamp), 'HH:mm')}
                    stroke="#ef4444"
                    strokeDasharray="4 2"
                    strokeWidth={1.5}
                    label={{ value: 'EXIT', position: 'top', fontSize: 9, fill: '#ef4444' }}
                  />
                ))}
                {annotationPoints.map((p, i) => (
                  <ReferenceLine
                    key={`ann-${i}`}
                    x={p.time}
                    stroke="#eab308"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                ))}
                <Bar
                  dataKey="tokens"
                  radius={[3, 3, 0, 0]}
                  fill="#00f5ff"
                  opacity={0.75}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Token breakdown + donut ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Token bars */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block mb-4">
              Token Breakdown
            </span>
            <div className="space-y-3">
              <TokenBar
                label="Input"
                value={session.tokensInput}
                total={totalTokens}
                color="#3b82f6"
              />
              <TokenBar
                label="Output"
                value={session.tokensOutput}
                total={totalTokens}
                color="#00f5ff"
              />
              <TokenBar
                label="Cache"
                value={session.tokensCache}
                total={totalTokens}
                color="#a855f7"
              />
            </div>
            <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex justify-between text-xs text-[#606060]">
              <span>Total tokens</span>
              <span className="font-mono text-[#a0a0a0]">{fmt(totalTokens)}</span>
            </div>
            <div className="flex justify-between text-xs text-[#606060]">
              <span>Cache efficiency</span>
              <span className="font-mono" style={{ color: cacheEfficiency > 30 ? '#22c55e' : '#a0a0a0' }}>
                {cacheEfficiency.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Donut chart */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block mb-2">
              Token Distribution
            </span>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      fontSize: 11
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: '#a0a0a0', fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-[#404040] text-xs">
                No token data
              </div>
            )}
          </div>
        </div>

        {/* ── Session info + cost breakdown ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Session metadata */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-2">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block mb-3">
              Session Info
            </span>
            <InfoRow label="Session ID" value={session.id} mono />
            <InfoRow label="PID" value={String(session.pid)} mono />
            <InfoRow label="Model" value={session.model} mono />
            <InfoRow
              label="Started"
              value={format(startDate, 'yyyy-MM-dd HH:mm:ss')}
              mono
            />
            <InfoRow
              label="Last active"
              value={formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
            />
            <InfoRow label="Runtime" value={fmtDuration(session.runtimeSeconds)} mono />
            <InfoRow label="Path" value={session.projectPath} mono truncate />
          </div>

          {/* Cost detail */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-2">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block mb-3">
              Cost Breakdown
            </span>
            <CostRow
              label="Input cost"
              tokens={session.tokensInput}
              model={session.model}
              type="input"
            />
            <CostRow
              label="Output cost"
              tokens={session.tokensOutput}
              model={session.model}
              type="output"
            />
            <CostRow
              label="Cache cost"
              tokens={session.tokensCache}
              model={session.model}
              type="cache"
            />
            <div className="pt-2 border-t border-[#2a2a2a] flex justify-between">
              <span className="text-xs text-[#606060]">Total session cost</span>
              <span className="text-sm font-semibold font-mono text-[#00f5ff]">
                ${session.costUsd.toFixed(4)}
              </span>
            </div>
            <div className="pt-1 text-[10px] text-[#404040]">
              Rates: input ${modelInputPrice(session.model)}/1M · output ${modelOutputPrice(session.model)}/1M
            </div>
          </div>
        </div>

        {/* ── Notes + Tags ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <NotesEditor sessionId={session.id} initialNote={session.note} />
          <TagsPanel sessionId={session.id} initialTags={session.tags} />
        </div>

      </div>
    </div>
  )
}

// ── Utility sub-components ────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
  truncate
}: {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-[#606060] flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-[#a0a0a0] text-right ${mono ? 'font-mono' : ''} ${truncate ? 'truncate max-w-[200px]' : ''}`}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

const MODEL_PRICES: Record<string, [number, number]> = {
  'claude-sonnet-4-6': [3, 15],
  'claude-sonnet-4-5': [3, 15],
  'claude-opus-4-6': [15, 75],
  'claude-opus-4-5': [15, 75],
  'claude-haiku-4-5': [0.8, 4]
}

function modelInputPrice(model: string): number {
  return (MODEL_PRICES[model] ?? MODEL_PRICES['claude-sonnet-4-6'])[0]
}
function modelOutputPrice(model: string): number {
  return (MODEL_PRICES[model] ?? MODEL_PRICES['claude-sonnet-4-6'])[1]
}

function CostRow({
  label,
  tokens,
  model,
  type
}: {
  label: string
  tokens: number
  model: string
  type: 'input' | 'output' | 'cache'
}): React.JSX.Element {
  const [inp, out] = MODEL_PRICES[model] ?? MODEL_PRICES['claude-sonnet-4-6']
  const rate = type === 'input' ? inp : type === 'output' ? out : inp * 0.1
  const cost = (tokens * rate) / 1_000_000
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#606060]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-[#404040]">{fmt(tokens)} tok</span>
        <span className="text-xs font-mono text-[#a0a0a0]">${cost.toFixed(4)}</span>
      </div>
    </div>
  )
}
