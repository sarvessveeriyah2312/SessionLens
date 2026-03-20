import { insertTimelineEvent, getTimelineEvents } from './database'
import { ProcessDetector } from './ProcessDetector'
import { readFile } from 'fs/promises'
import type { SessionState, TimelineEvent } from './types'

// Simple UUID without external dep
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export class TimelineRecorder {
  private lastStates: Map<string, string> = new Map()
  private sampleTimer: NodeJS.Timeout | null = null
  private detector = new ProcessDetector()

  start(getSessions: () => SessionState[], intervalMs: number = 30_000): void {
    this.sampleTimer = setInterval(() => {
      const sessions = getSessions()
      this.recordSamples(sessions)
    }, intervalMs)
  }

  stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer)
      this.sampleTimer = null
    }
  }

  recordSamples(sessions: SessionState[]): void {
    const now = new Date().toISOString()

    for (const session of sessions) {
      const lastState = this.lastStates.get(session.id)
      const currentState = session.status === 'exited' ? 'exited' : session.status === 'idle' ? 'idle' : 'active'

      // Record token sample
      const sampleEvent: TimelineEvent = {
        id: makeId(),
        sessionId: session.id,
        timestamp: now,
        eventType: 'token_sample',
        tokensInput: session.tokensInput,
        tokensOutput: session.tokensOutput,
        tokensCache: session.tokensCache,
        state: currentState as TimelineEvent['state']
      }

      try {
        insertTimelineEvent(sampleEvent)
      } catch {
        // DB might not be available
      }

      // Detect and record state change
      if (lastState && lastState !== currentState) {
        const changeEvent: TimelineEvent = {
          id: makeId(),
          sessionId: session.id,
          timestamp: now,
          eventType: 'state_change',
          tokensInput: session.tokensInput,
          tokensOutput: session.tokensOutput,
          tokensCache: session.tokensCache,
          state: currentState as TimelineEvent['state'],
          annotationText: `State changed from ${lastState} to ${currentState}`
        }

        try {
          insertTimelineEvent(changeEvent)
        } catch {
          // Silent
        }
      }

      this.lastStates.set(session.id, currentState)
    }
  }

  addAnnotation(sessionId: string, text: string): void {
    const now = new Date().toISOString()
    const event: TimelineEvent = {
      id: makeId(),
      sessionId,
      timestamp: now,
      eventType: 'annotation',
      tokensInput: 0,
      tokensOutput: 0,
      tokensCache: 0,
      state: 'active',
      annotationText: text
    }

    try {
      insertTimelineEvent(event)
    } catch {
      // Silent
    }
  }

  getTimeline(sessionId: string, windowHours: number = 1): TimelineEvent[] {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
    try {
      const rows = getTimelineEvents(sessionId, since)
      if (rows.length > 0) return rows
    } catch {
      // fall through to JSONL build
    }
    return []
  }

  /**
   * Build timeline events from a raw JSONL file (used when the DB has no history yet).
   * Groups assistant messages into 30-second buckets.
   */
  async buildTimelineFromJonl(
    cwd: string,
    sessionId: string,
    windowHours = 1
  ): Promise<TimelineEvent[]> {
    const jonlPath = this.detector.jonlPath(cwd, sessionId)
    const since = Date.now() - windowHours * 60 * 60 * 1000
    const bucketMs = 30_000

    try {
      const raw = await readFile(jonlPath, 'utf-8')
      const lines = raw.split('\n').filter((l) => l.trim())

      // Accumulate tokens per 30-s bucket
      const buckets = new Map<number, { input: number; output: number; cache: number }>()

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          if (entry.type !== 'assistant' || !entry.message || !entry.timestamp) continue
          const ts = new Date(entry.timestamp).getTime()
          if (ts < since) continue
          const key = Math.floor(ts / bucketMs) * bucketMs
          const usage = entry.message.usage ?? {}
          const b = buckets.get(key) ?? { input: 0, output: 0, cache: 0 }
          b.input += usage.input_tokens ?? 0
          b.output += usage.output_tokens ?? 0
          b.cache +=
            (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
          buckets.set(key, b)
        } catch {
          // skip bad line
        }
      }

      const events: TimelineEvent[] = []
      for (const [key, b] of [...buckets.entries()].sort((a, z) => a[0] - z[0])) {
        events.push({
          id: `jonl-${sessionId}-${key}`,
          sessionId,
          timestamp: new Date(key).toISOString(),
          eventType: 'token_sample',
          tokensInput: b.input,
          tokensOutput: b.output,
          tokensCache: b.cache,
          state: 'active'
        })
      }
      return events
    } catch {
      return []
    }
  }
}
