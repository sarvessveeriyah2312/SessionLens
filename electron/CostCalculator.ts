import { getCostsByDateRange } from './database'
import type { SessionState, CostSummary } from './types'

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-haiku-4-6': { input: 0.25, output: 1.25 }
}

export class CostCalculator {
  private budgetMonthly: number = 100
  private budgetPerSession: number = 10
  private alertCallback: ((type: string, value: number, limit: number) => void) | null = null

  setBudgets(monthly: number, perSession: number): void {
    this.budgetMonthly = monthly
    this.budgetPerSession = perSession
  }

  onAlert(callback: (type: string, value: number, limit: number) => void): void {
    this.alertCallback = callback
  }

  calcSessionCost(model: string, input: number, output: number, cache: number): number {
    const prices = MODEL_PRICES[model] || MODEL_PRICES['claude-sonnet-4-6']
    return (input * prices.input + output * prices.output + cache * 0.3 * prices.input) / 1_000_000
  }

  checkAlerts(sessions: SessionState[], summary: CostSummary): void {
    if (!this.alertCallback) return

    if (summary.thisMonth >= this.budgetMonthly) {
      this.alertCallback('monthly_budget', summary.thisMonth, this.budgetMonthly)
    }

    for (const session of sessions) {
      if (session.costUsd >= this.budgetPerSession) {
        this.alertCallback('session_budget', session.costUsd, this.budgetPerSession)
      }
    }
  }

  computeSummary(sessions: SessionState[]): CostSummary {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    // Try to get DB data, fall back to session data
    let dbRows: Array<{ date: string; total: number; project_name: string; model: string }> = []
    try {
      dbRows = getCostsByDateRange(monthStartStr, todayStr)
    } catch {
      // Use session data as fallback
    }

    let today = 0
    let thisWeek = 0
    let thisMonth = 0
    const byProject: Record<string, number> = {}
    const byModel: Record<string, number> = {}
    const dailyMap: Record<string, number> = {}

    if (dbRows.length > 0) {
      for (const row of dbRows) {
        const rowDate = new Date(row.date)
        if (row.date === todayStr) today += row.total
        if (rowDate >= weekAgo) thisWeek += row.total
        thisMonth += row.total
        byProject[row.project_name] = (byProject[row.project_name] || 0) + row.total
        byModel[row.model] = (byModel[row.model] || 0) + row.total
        dailyMap[row.date] = (dailyMap[row.date] || 0) + row.total
      }
    } else {
      // Use live session data as source of truth
      for (const session of sessions) {
        const sessionDate = new Date(session.startTime)
        const sessionDateStr = sessionDate.toISOString().slice(0, 10)

        if (sessionDateStr === todayStr) today += session.costUsd
        if (sessionDate >= weekAgo) thisWeek += session.costUsd
        if (sessionDate >= monthStart) thisMonth += session.costUsd

        byProject[session.projectName] = (byProject[session.projectName] || 0) + session.costUsd
        byModel[session.model] = (byModel[session.model] || 0) + session.costUsd
        dailyMap[sessionDateStr] = (dailyMap[sessionDateStr] || 0) + session.costUsd
      }
    }

    // Build daily trend for last 30 days
    const dailyTrend: Array<{ date: string; cost: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      dailyTrend.push({ date: dateStr, cost: dailyMap[dateStr] || 0 })
    }

    // Projection
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyAvg = dayOfMonth > 0 ? thisMonth / dayOfMonth : 0
    const projectedMonthEnd = dailyAvg * daysInMonth

    // Cache efficiency
    let totalTokens = 0
    let cacheTokens = 0
    for (const s of sessions) {
      totalTokens += s.tokensInput + s.tokensOutput + s.tokensCache
      cacheTokens += s.tokensCache
    }
    const cacheEfficiency = totalTokens > 0 ? cacheTokens / totalTokens : 0

    // Sum allTime
    const allTime = sessions.reduce((sum, s) => sum + s.costUsd, 0)

    return {
      today,
      thisWeek,
      thisMonth,
      allTime,
      projectedMonthEnd,
      byProject,
      byModel,
      dailyTrend,
      cacheEfficiency
    }
  }
}
