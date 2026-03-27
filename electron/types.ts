export interface SessionState {
  id: string
  pid: number
  projectName: string
  projectPath: string
  status: 'active' | 'idle' | 'exited' | 'completed'
  startTime: number
  lastActivity: number
  runtimeSeconds: number
  cpu: number
  memory: number
  tokensInput: number
  tokensOutput: number
  tokensCache: number
  costUsd: number
  model: string
  tags: string[]
  note: string
  sparklineData: number[]
}

export interface TimelineEvent {
  id: string
  sessionId: string
  timestamp: string
  eventType: 'token_sample' | 'state_change' | 'annotation'
  tokensInput: number
  tokensOutput: number
  tokensCache: number
  state: 'active' | 'idle' | 'exited'
  annotationText?: string
}

export interface CostSummary {
  today: number
  thisWeek: number
  thisMonth: number
  allTime: number
  projectedMonthEnd: number
  byProject: Record<string, number>
  byModel: Record<string, number>
  dailyTrend: Array<{ date: string; cost: number }>
  cacheEfficiency: number
}

export interface PeerState {
  user: { name: string; color: string }
  lastUpdated: string
  sessions: SessionState[]
  isOnline: boolean
}

export interface UserSettings {
  refreshInterval: number
  timelineRetentionDays: number
  budget: { monthly: number; perSession: number }
  team: {
    enabled: boolean
    mode: 'lan' | 'folder'
    sharedFolderPath: string
    displayName: string
    color: string
  }
  notifications: {
    idle: boolean
    exit: boolean
    budget: boolean
  }
}

export interface ReleaseInfo {
  version: string
  name: string
  changelog: string
  releaseUrl: string
  publishedAt: string
}

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  changelog: string
  releaseUrl: string
  publishedAt: string
}

export interface ProcessInfo {
  pid: number
  sessionId: string
  cwd: string
  startedAt: number
}

export interface ExportRow {
  id: string
  projectName: string
  projectPath: string
  status: string
  startTime: string
  runtimeSeconds: number
  costUsd: number
  tokensInput: number
  tokensOutput: number
  tokensCache: number
  model: string
  tags: string
  note: string
}
