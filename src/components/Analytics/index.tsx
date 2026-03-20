import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import type { CostSummary, UserSettings } from '../../../electron/types'

const PIE_COLORS = ['#00f5ff', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']

// ── Enhanced Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  extra,
  trend
}: {
  label: string
  value: string
  extra?: React.ReactNode
  trend?: { value: number; direction: 'up' | 'down' | 'flat' }
}): React.JSX.Element {
  return (
    <div className="group relative overflow-hidden bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-4 transition-all hover:border-[#00f5ff]/40 hover:shadow-lg hover:shadow-[#00f5ff]/5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold font-mono text-[#00f5ff]">
        {value}
      </div>
      {trend && (
        <div className={`text-[10px] mt-1 flex items-center gap-1 ${
          trend.direction === 'up' ? 'text-emerald-400' : 
          trend.direction === 'down' ? 'text-rose-400' : 'text-gray-500'
        }`}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
          {Math.abs(trend.value)}% from last period
        </div>
      )}
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  )
}

// ── Budget Progress Card (Enhanced) ─────────────────────────────────────────

function BudgetProgress({ 
  current, 
  budget, 
  projected,
  status 
}: { 
  current: number
  budget: number
  projected: number
  status: 'on-track' | 'at-risk' | 'over'
}) {
  const percentage = Math.min(100, (current / budget) * 100)
  const statusConfig = {
    'on-track': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'On Track' },
    'at-risk': { color: '#eab308', bg: 'rgba(234,179,8,0.1)', label: 'At Risk' },
    'over': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Over Budget' }
  }[status]

  return (
    <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-5 transition-all hover:border-[#00f5ff]/30">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-white uppercase tracking-wider">
          Monthly Budget
        </span>
        <div className="px-2 py-1 rounded-lg text-xs font-medium"
             style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
          {statusConfig.label}
        </div>
      </div>
      
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-2xl font-bold text-white">${current.toFixed(2)}</span>
        <span className="text-sm text-gray-500">of ${budget.toFixed(2)}</span>
      </div>
      
      <div className="relative w-full h-2 bg-[#0a0c12] rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, backgroundColor: statusConfig.color }}
        />
      </div>
      
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Projected end</span>
        <span className={`font-mono ${projected > budget ? 'text-rose-400' : 'text-emerald-400'}`}>
          ${projected.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Analytics(): React.JSX.Element {
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [budget, setBudget] = useState({ monthly: 100, perSession: 10 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [report, settings] = await Promise.all([
        window.api?.getCostReport(),
        window.api?.getSettings()
      ])
      if (report) setSummary(report)
      if (settings) {
        setBudget((settings as UserSettings).budget)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = window.api?.onCostUpdate((updated) => {
      setSummary(updated)
    })
    return () => unsub?.()
  }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-[#00f5ff]/20 border-t-[#00f5ff] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-600">Loading analytics data...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="text-sm text-gray-600">No cost data available</div>
        <div className="text-xs text-gray-700">Start using Claude Code to see analytics</div>
      </div>
    )
  }

  const budgetStatus =
    summary.thisMonth >= budget.monthly
      ? 'over'
      : summary.projectedMonthEnd >= budget.monthly
      ? 'at-risk'
      : 'on-track'

  const byProjectData = Object.entries(summary.byProject)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, cost]) => ({ 
      name: name.length > 25 ? name.slice(0, 22) + '...' : name, 
      cost: parseFloat(cost.toFixed(3)),
      fullName: name
    }))

  const byModelData = Object.entries(summary.byModel).map(([name, cost], i) => ({
    name: name.replace('claude-', '').replace('-4-6', '').replace('-4-5', ''),
    fullName: name,
    cost: parseFloat(cost.toFixed(3)),
    color: PIE_COLORS[i % PIE_COLORS.length]
  }))

  const dailyTrendData = summary.dailyTrend.map((d) => ({
    date: d.date.slice(5),
    fullDate: d.date,
    cost: parseFloat(d.cost.toFixed(3))
  }))

  // Calculate trend for today vs yesterday
  const todayCost = summary.today
  const yesterdayCost = summary.dailyTrend[summary.dailyTrend.length - 2]?.cost || 0
  const dayTrend = yesterdayCost > 0 ? ((todayCost - yesterdayCost) / yesterdayCost) * 100 : 0

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#0a0a0f] to-[#050507]">
      <div className="p-6 space-y-6">
        
        {/* Header */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5ff]/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Cost Analytics
              </h1>
              <p className="text-sm text-gray-600 mt-1">Monitor usage patterns and optimize spending</p>
            </div>
            <div className="text-xs text-gray-500 bg-[#12141c] px-3 py-1.5 rounded-lg border border-[#252a38]">
              Last 30 days
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Today"
            value={`$${summary.today.toFixed(2)}`}
            trend={dayTrend !== 0 ? {
              value: Math.abs(Number(dayTrend.toFixed(1))),
              direction: dayTrend > 0 ? 'up' : 'down'
            } : undefined}
          />
          <StatCard
            label="This Week"
            value={`$${summary.thisWeek.toFixed(2)}`}
          />
          <StatCard
            label="This Month"
            value={`$${summary.thisMonth.toFixed(2)}`}
          />
          <StatCard
            label="Projected Month-End"
            value={`$${summary.projectedMonthEnd.toFixed(2)}`}
            extra={
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                budgetStatus === 'on-track' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                budgetStatus === 'at-risk' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {budgetStatus === 'on-track' ? 'On Track' : budgetStatus === 'at-risk' ? 'At Risk' : 'Over Budget'}
              </div>
            }
          />
        </div>

        {/* Budget Progress + Cache Efficiency Row */}
        <div className="grid grid-cols-2 gap-5">
          <BudgetProgress 
            current={summary.thisMonth}
            budget={budget.monthly}
            projected={summary.projectedMonthEnd}
            status={budgetStatus}
          />
          
          {/* Cache Efficiency Card */}
          <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-5 transition-all hover:border-[#00f5ff]/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white uppercase tracking-wider">
                Cache Efficiency
              </span>
              <span className="text-2xl font-bold font-mono text-[#00f5ff]">
                {(summary.cacheEfficiency * 100).toFixed(1)}%
              </span>
            </div>
            <div className="relative w-full h-3 bg-[#0a0c12] rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                style={{ 
                  width: `${summary.cacheEfficiency * 100}%`,
                  background: 'linear-gradient(90deg, #00f5ff, #00a3cc)'
                }}
              />
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span>Lower cost with prompt caching</span>
              <span className="text-emerald-400">+{((summary.cacheEfficiency * 100) / 2).toFixed(0)}% savings</span>
            </div>
          </div>
        </div>

        {/* Daily Trend Chart - Enhanced */}
        <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-5 transition-all hover:border-[#00f5ff]/30">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-semibold text-white uppercase tracking-wider">
              Daily Cost Trend
            </span>
            <div className="text-xs text-gray-500">Last 30 days</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00f5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1a1e2a" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#5a6380' }}
                axisLine={{ stroke: '#252a38' }}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#5a6380' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{ 
                  background: '#12141c', 
                  border: '1px solid #2a2d38', 
                  borderRadius: 12,
                  fontSize: 11,
                  color: '#fff'
                }}
                formatter={(v: number) => [`$${v.toFixed(3)}`, 'Cost']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <ReferenceLine
                y={budget.monthly / 30}
                stroke="#f97316"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{ 
                  value: 'Daily avg limit', 
                  position: 'insideTopRight', 
                  fontSize: 9, 
                  fill: '#f97316',
                  offset: 5
                }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#00f5ff"
                strokeWidth={2}
                fill="url(#costGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#00f5ff', stroke: '#fff', strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Row - Project & Model Analysis */}
        <div className="grid grid-cols-2 gap-5">
          {/* Cost by Project - Enhanced */}
          <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-5 transition-all hover:border-[#00f5ff]/30">
            <div className="mb-5">
              <span className="text-sm font-semibold text-white uppercase tracking-wider">
                Cost by Project
              </span>
            </div>
            {byProjectData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-xs text-gray-600">No project data</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={byProjectData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 80, bottom: 0 }}
                  barSize={12}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#5a6380' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#a0a0a0' }}
                    axisLine={false}
                    tickLine={false}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{ 
                      background: '#12141c', 
                      border: '1px solid #2a2d38', 
                      borderRadius: 12,
                      fontSize: 11
                    }}
                    formatter={(v: number) => [`$${v.toFixed(3)}`, 'Cost']}
                    labelFormatter={(label, payload) => {
                      const data = payload[0]?.payload
                      return data?.fullName || label
                    }}
                  />
                  <Bar 
                    dataKey="cost" 
                    fill="#00f5ff" 
                    radius={[0, 4, 4, 0]}
                    background={{ fill: '#0a0c12', radius: 4 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cost by Model + Stats - Enhanced */}
          <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-5 transition-all hover:border-[#00f5ff]/30">
            <div className="mb-4">
              <span className="text-sm font-semibold text-white uppercase tracking-wider">
                Cost by Model
              </span>
            </div>

            {byModelData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <span className="text-xs text-gray-600">No model data</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={byModelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="cost"
                    >
                      {byModelData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        background: '#12141c', 
                        border: '1px solid #2a2d38', 
                        borderRadius: 12,
                        fontSize: 11
                      }}
                      formatter={(v: number) => [`$${v.toFixed(3)}`, 'Cost']}
                      labelFormatter={(label, payload) => {
                        const data = payload[0]?.payload
                        return data?.fullName || label
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      formatter={(value) => (
                        <span className="text-gray-400 text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1a1e2a]">
                  {byModelData.slice(0, 3).map((model) => (
                    <div key={model.name} className="text-center">
                      <div className="text-[10px] text-gray-500">{model.name}</div>
                      <div className="text-xs font-mono text-gray-300">${model.cost.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Additional Insight - Top Session */}
        {summary.topSession && (
          <div className="bg-gradient-to-r from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl p-4 transition-all hover:border-[#00f5ff]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-gray-500">Most Expensive Session</div>
                  <div className="text-sm font-semibold text-white">{summary.topSession.projectName}</div>
                  <div className="text-xs text-gray-600 font-mono">{summary.topSession.model}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-[#00f5ff]">
                  ${summary.topSession.cost.toFixed(4)}
                </div>
                <div className="text-[10px] text-gray-500">
                  {formatDuration(summary.topSession.duration)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}