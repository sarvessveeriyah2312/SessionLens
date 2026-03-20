import { EventEmitter } from 'events'
import { watch } from 'chokidar'
import type { FSWatcher } from 'chokidar'
import { ProcessDetector } from './ProcessDetector'
import { upsertSession, getSessionAnnotation } from './database'
import type { SessionState } from './types'

/** A session is "active" if its JSONL was written to within the last 3 minutes */
const ACTIVE_THRESHOLD_MS = 3 * 60_000

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-opus-4-5': { input: 15, output: 75 },
  'claude-haiku-4-5': { input: 0.8, output: 4 }
}

function calcCost(model: string, input: number, output: number, cache: number): number {
  const prices = MODEL_PRICES[model] ?? MODEL_PRICES['claude-sonnet-4-6']
  // cache = cacheCreation + cacheRead; cache reads cost ~10% of input price
  return (input * prices.input + output * prices.output + cache * 0.1 * prices.input) / 1_000_000
}

function projectNameFromPath(cwd: string): string {
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
  return parts[parts.length - 1] ?? cwd
}

export class SessionManager extends EventEmitter {
  private detector = new ProcessDetector()
  private sessions = new Map<string, SessionState>()
  private pollTimer: NodeJS.Timeout | null = null
  private sessionsDirWatcher: FSWatcher | null = null
  private jonlWatchers = new Map<string, FSWatcher>()

  start(intervalMs = 2000): void {
    this.poll()
    this.pollTimer = setInterval(() => this.poll(), intervalMs)
    this.watchSessionsDir()
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.sessionsDirWatcher?.close()
    for (const w of this.jonlWatchers.values()) w.close()
    this.jonlWatchers.clear()
  }

  getSessions(): SessionState[] {
    return Array.from(this.sessions.values()).map((s) => {
      try {
        const ann = getSessionAnnotation(s.id)
        return { ...s, tags: ann.tags, note: ann.note }
      } catch {
        return { ...s }
      }
    })
  }

  // ─── Polling ────────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      const active = await this.detector.getActiveSessions()
      const seenIds = new Set<string>()

      for (const proc of active) {
        const id = proc.sessionId
        seenIds.add(id)

        // Fetch live token data from JSONL
        const usage = await this.detector.parseSessionJonl(proc.cwd, proc.sessionId)
        const stats = await this.detector.getProcessStats(proc.pid)
        const mtime = await this.detector.getJonlMtime(proc.cwd, proc.sessionId)

        const status: SessionState['status'] =
          !stats.alive
            ? 'exited'
            : Date.now() - mtime < ACTIVE_THRESHOLD_MS
              ? 'active'
              : 'idle'

        const existing = this.sessions.get(id)
        const session: SessionState = {
          id,
          pid: proc.pid,
          projectName: projectNameFromPath(proc.cwd),
          projectPath: proc.cwd,
          status,
          startTime: proc.startedAt,
          lastActivity: mtime || proc.startedAt,
          runtimeSeconds: Math.floor((Date.now() - proc.startedAt) / 1000),
          cpu: stats.cpu,
          memory: stats.memoryMb,
          tokensInput: usage?.inputTokens ?? 0,
          tokensOutput: usage?.outputTokens ?? 0,
          tokensCache: (usage?.cacheCreation ?? 0) + (usage?.cacheRead ?? 0),
          costUsd: usage
            ? calcCost(
                usage.model,
                usage.inputTokens,
                usage.outputTokens,
                usage.cacheCreation + usage.cacheRead
              )
            : 0,
          model: usage?.model ?? 'claude-sonnet-4-6',
          tags: existing?.tags ?? [],
          note: existing?.note ?? '',
          sparklineData: usage?.sparkline ?? new Array(12).fill(0)
        }

        this.sessions.set(id, session)
        try { upsertSession(session) } catch { /* db not ready yet */ }

        // Watch this session's JONL for live changes
        this.watchJonl(proc.cwd, proc.sessionId)

        if (!existing) this.emit('session-new', session)
      }

      // Mark sessions that disappeared from the sessions dir as exited
      for (const [id, session] of this.sessions.entries()) {
        if (!seenIds.has(id) && session.status !== 'exited') {
          const updated = { ...session, status: 'exited' as const }
          this.sessions.set(id, updated)
          try { upsertSession(updated) } catch { /* */ }
          this.stopWatchingJonl(session.projectPath, id)
          this.emit('session-exited', updated)
        }
      }

      this.emit('sessions-updated', this.getSessions())
    } catch {
      // silent — will retry next tick
    }
  }

  // ─── File watchers ───────────────────────────────────────────────────────────

  /** Watch ~/.claude/sessions/ so new sessions appear immediately */
  private watchSessionsDir(): void {
    try {
      this.sessionsDirWatcher = watch(this.detector.sessionsDir(), {
        ignoreInitial: true,
        depth: 0
      })
      this.sessionsDirWatcher.on('add', () => this.poll())
      this.sessionsDirWatcher.on('unlink', () => this.poll())
    } catch {
      // chokidar unavailable or directory missing — fall back to polling
    }
  }

  /** Watch a session's JONL file so metrics refresh as Claude writes responses */
  private watchJonl(cwd: string, sessionId: string): void {
    if (this.jonlWatchers.has(sessionId)) return
    const jonlPath = this.detector.jonlPath(cwd, sessionId)
    try {
      const watcher = watch(jonlPath, { ignoreInitial: true })
      watcher.on('change', () => this.refreshSession(cwd, sessionId))
      this.jonlWatchers.set(sessionId, watcher)
    } catch {
      // file may not exist yet
    }
  }

  private stopWatchingJonl(cwd: string, sessionId: string): void {
    const watcher = this.jonlWatchers.get(sessionId)
    if (watcher) {
      watcher.close()
      this.jonlWatchers.delete(sessionId)
    }
  }

  /** Re-parse a single session's JSONL and push updated state */
  private async refreshSession(cwd: string, sessionId: string): Promise<void> {
    const existing = this.sessions.get(sessionId)
    if (!existing) return

    const usage = await this.detector.parseSessionJonl(cwd, sessionId)
    const stats = await this.detector.getProcessStats(existing.pid)
    const mtime = await this.detector.getJonlMtime(cwd, sessionId)

    const status: SessionState['status'] =
      !stats.alive
        ? 'exited'
        : Date.now() - mtime < ACTIVE_THRESHOLD_MS
          ? 'active'
          : 'idle'

    const updated: SessionState = {
      ...existing,
      status,
      cpu: stats.cpu,
      memory: stats.memoryMb,
      tokensInput: usage?.inputTokens ?? existing.tokensInput,
      tokensOutput: usage?.outputTokens ?? existing.tokensOutput,
      tokensCache: usage
        ? (usage.cacheCreation + usage.cacheRead)
        : existing.tokensCache,
      costUsd: usage
        ? calcCost(
            usage.model,
            usage.inputTokens,
            usage.outputTokens,
            usage.cacheCreation + usage.cacheRead
          )
        : existing.costUsd,
      model: usage?.model ?? existing.model,
      lastActivity: mtime || existing.lastActivity,
      runtimeSeconds: Math.floor((Date.now() - existing.startTime) / 1000),
      sparklineData: usage?.sparkline ?? existing.sparklineData
    }

    this.sessions.set(sessionId, updated)
    try { upsertSession(updated) } catch { /* */ }
    this.emit('sessions-updated', this.getSessions())
  }

  // ─── Tag / Note mutations (unchanged API) ────────────────────────────────────

  addTag(sessionId: string, tag: string): void {
    const s = this.sessions.get(sessionId)
    if (s && !s.tags.includes(tag)) s.tags = [...s.tags, tag]
  }

  removeTag(sessionId: string, tag: string): void {
    const s = this.sessions.get(sessionId)
    if (s) s.tags = s.tags.filter((t) => t !== tag)
  }

  setNote(sessionId: string, note: string): void {
    const s = this.sessions.get(sessionId)
    if (s) s.note = note
  }
}
