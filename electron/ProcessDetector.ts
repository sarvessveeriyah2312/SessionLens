import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ClaudeSessionFile {
  pid: number
  sessionId: string
  cwd: string
  startedAt: number
}

export interface ProcessStats {
  cpu: number
  memoryMb: number
  alive: boolean
}

export interface JonlUsage {
  inputTokens: number
  outputTokens: number
  cacheCreation: number
  cacheRead: number
  model: string
  firstTimestamp: string
  lastTimestamp: string
  /** [bucket0, …, bucket11] — 12×5-min buckets covering last 60 min, value = output tokens */
  sparkline: number[]
}

const CLAUDE_DIR = join(homedir(), '.claude')

/** /Users/foo/bar  →  -Users-foo-bar */
export function encodeProjectPath(cwd: string): string {
  return cwd.replace(/\//g, '-')
}

export class ProcessDetector {
  /** Read all active Claude Code sessions from ~/.claude/sessions/*.json */
  async getActiveSessions(): Promise<ClaudeSessionFile[]> {
    const sessionsDir = join(CLAUDE_DIR, 'sessions')
    try {
      const files = await readdir(sessionsDir)
      const results: ClaudeSessionFile[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          const raw = await readFile(join(sessionsDir, file), 'utf-8')
          const data = JSON.parse(raw)
          if (data.pid && data.sessionId && data.cwd) {
            results.push({
              pid: Number(data.pid),
              sessionId: data.sessionId,
              cwd: data.cwd,
              startedAt: data.startedAt ?? Date.now()
            })
          }
        } catch {
          // malformed file — skip
        }
      }

      return results
    } catch {
      return []
    }
  }

  /** Read and parse a session's JSONL file, summing token usage */
  async parseSessionJonl(cwd: string, sessionId: string): Promise<JonlUsage | null> {
    const projectDir = join(CLAUDE_DIR, 'projects', encodeProjectPath(cwd))
    const jonlPath = join(projectDir, `${sessionId}.jsonl`)

    try {
      const raw = await readFile(jonlPath, 'utf-8')
      const lines = raw.split('\n').filter((l) => l.trim())

      let inputTokens = 0
      let outputTokens = 0
      let cacheCreation = 0
      let cacheRead = 0
      let model = 'claude-sonnet-4-6'
      let firstTimestamp = ''
      let lastTimestamp = ''

      // For sparkline: 12 buckets × 5 min = last 60 min
      const now = Date.now()
      const buckets = new Array(12).fill(0)

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)

          if (entry.timestamp) {
            if (!firstTimestamp) firstTimestamp = entry.timestamp
            lastTimestamp = entry.timestamp
          }

          if (entry.type === 'assistant' && entry.message) {
            const msg = entry.message
            if (msg.model) model = msg.model
            const usage = msg.usage ?? {}
            inputTokens += usage.input_tokens ?? 0
            outputTokens += usage.output_tokens ?? 0
            cacheCreation += usage.cache_creation_input_tokens ?? 0
            cacheRead += usage.cache_read_input_tokens ?? 0

            // Sparkline: bucket this message's output tokens by time
            if (entry.timestamp && (usage.output_tokens ?? 0) > 0) {
              const ageMs = now - new Date(entry.timestamp).getTime()
              const ageMin = ageMs / 60_000
              if (ageMin >= 0 && ageMin < 60) {
                const bucket = 11 - Math.floor(ageMin / 5)
                if (bucket >= 0 && bucket < 12) {
                  buckets[bucket] += usage.output_tokens
                }
              }
            }
          }
        } catch {
          // skip malformed line
        }
      }

      // Normalise sparkline to 0–100 scale
      const maxBucket = Math.max(...buckets, 1)
      const sparkline = buckets.map((v) => Math.round((v / maxBucket) * 100))

      return {
        inputTokens,
        outputTokens,
        cacheCreation,
        cacheRead,
        model,
        firstTimestamp,
        lastTimestamp,
        sparkline
      }
    } catch {
      return null
    }
  }

  /** Get the mtime of a session's JSONL file (used for active/idle detection) */
  async getJonlMtime(cwd: string, sessionId: string): Promise<number> {
    const jonlPath = join(
      CLAUDE_DIR,
      'projects',
      encodeProjectPath(cwd),
      `${sessionId}.jsonl`
    )
    try {
      const s = await stat(jonlPath)
      return s.mtimeMs
    } catch {
      return 0
    }
  }

  /** CPU (%) and memory (MB) for a given PID via `ps` */
  async getProcessStats(pid: number): Promise<ProcessStats> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `wmic process where ProcessId=${pid} get WorkingSetSize,PercentProcessorTime /format:csv`
        )
        const parts = stdout.trim().split('\n').pop()?.split(',') ?? []
        return {
          cpu: parseFloat(parts[1] ?? '0') || 0,
          memoryMb: Math.round(parseInt(parts[2] ?? '0') / 1_048_576),
          alive: parts.length > 1
        }
      } else {
        const { stdout } = await execAsync(
          `ps -p ${pid} -o %cpu=,rss= 2>/dev/null`
        )
        const parts = stdout.trim().split(/\s+/)
        if (parts.length < 2 || !parts[0]) return { cpu: 0, memoryMb: 0, alive: false }
        return {
          cpu: parseFloat(parts[0]) || 0,
          memoryMb: Math.round(parseInt(parts[1]) / 1024),
          alive: true
        }
      }
    } catch {
      return { cpu: 0, memoryMb: 0, alive: false }
    }
  }

  /** Return JSONL path for a session (used by watchers) */
  jonlPath(cwd: string, sessionId: string): string {
    return join(CLAUDE_DIR, 'projects', encodeProjectPath(cwd), `${sessionId}.jsonl`)
  }

  sessionsDir(): string {
    return join(CLAUDE_DIR, 'sessions')
  }
}
