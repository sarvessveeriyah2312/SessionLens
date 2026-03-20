import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { TimelineEvent } from '../../../electron/types'

type TimeWindow = '1h' | '6h' | '24h'

const WINDOW_HOURS: Record<TimeWindow, number> = { '1h': 1, '6h': 6, '24h': 24 }

interface ChartPoint {
  time: string
  tokens: number
  state: string
  isStateChange?: boolean
  isAnnotation?: boolean
  annotationText?: string
}

function buildChartData(events: TimelineEvent[]): ChartPoint[] {
  const samples = events.filter((e) => e.eventType === 'token_sample')
  const stateChanges = events.filter((e) => e.eventType === 'state_change')
  const annotations = events.filter((e) => e.eventType === 'annotation')

  // Compute per-interval token deltas
  const points: ChartPoint[] = []
  for (let i = 0; i < samples.length; i++) {
    const current = samples[i]
    const prev = samples[i - 1]
    const delta = prev
      ? (current.tokensInput + current.tokensOutput) -
        (prev.tokensInput + prev.tokensOutput)
      : current.tokensInput + current.tokensOutput

    const timeStr = format(parseISO(current.timestamp), 'HH:mm')
    const isStateChange = stateChanges.some((sc) => {
      const scTime = new Date(sc.timestamp).getTime()
      const curTime = new Date(current.timestamp).getTime()
      return Math.abs(scTime - curTime) < 31_000
    })
    const annotation = annotations.find((a) => {
      const aTime = new Date(a.timestamp).getTime()
      const curTime = new Date(current.timestamp).getTime()
      return Math.abs(aTime - curTime) < 31_000
    })

    points.push({
      time: timeStr,
      tokens: Math.max(0, delta),
      state: current.state,
      isStateChange,
      isAnnotation: !!annotation,
      annotationText: annotation?.annotationText
    })
  }

  return points
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: ChartPoint }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2 text-xs">
      <div className="text-[#a0a0a0] mb-1">{label}</div>
      <div className="text-white">Tokens: <span className="text-[#00f5ff]">{payload[0].value.toLocaleString()}</span></div>
      <div className="text-[#606060]">State: {data.state}</div>
      {data.annotationText && (
        <div className="text-[#eab308] mt-1 max-w-[200px] whitespace-normal">{data.annotationText}</div>
      )}
    </div>
  )
}

export default function Timeline({
  sessionId
}: {
  sessionId: string
}): React.JSX.Element {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1h')
  const [loading, setLoading] = useState(false)

  const loadTimeline = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api?.getTimeline(sessionId, WINDOW_HOURS[timeWindow])
      if (data) setEvents(data)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [sessionId, timeWindow])

  useEffect(() => {
    loadTimeline()
    const interval = setInterval(loadTimeline, 30_000)
    return () => clearInterval(interval)
  }, [loadTimeline])

  const chartData = buildChartData(events)
  const stateChangePoints = chartData.filter((p) => p.isStateChange)
  const exitPoints = events.filter(
    (e) => e.eventType === 'state_change' && e.state === 'exited'
  )

  return (
    <div>
      {/* Window controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#606060]">Token activity</span>
        <div className="flex gap-1">
          {(['1h', '6h', '24h'] as TimeWindow[]).map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                timeWindow === w
                  ? 'bg-[rgba(0,245,255,0.15)] text-[#00f5ff] border border-[rgba(0,245,255,0.3)]'
                  : 'text-[#606060] hover:text-[#a0a0a0]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-[#404040] text-xs">
          Loading timeline...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-[#404040] text-xs">
          No timeline data for this window
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={6} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Exit events - red reference lines */}
            {exitPoints.map((ep, i) => (
              <ReferenceLine
                key={`exit-${i}`}
                x={format(parseISO(ep.timestamp), 'HH:mm')}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeWidth={1}
                label={{ value: 'EXIT', position: 'top', fontSize: 9, fill: '#ef4444' }}
              />
            ))}

            {/* Annotation markers */}
            {chartData
              .filter((p) => p.isAnnotation)
              .map((p, i) => (
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
              fill="#00f5ff"
              opacity={0.7}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

