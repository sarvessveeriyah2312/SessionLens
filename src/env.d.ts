/// <reference types="vite/client" />

import type { SessionState, TimelineEvent, CostSummary, PeerState, UserSettings } from '../electron/types'

interface WindowApi {
  getSessions: () => Promise<SessionState[]>
  getTimeline: (sessionId: string, windowHours?: number) => Promise<TimelineEvent[]>
  addNote: (sessionId: string, note: string) => Promise<{ success: boolean; error?: string }>
  addTag: (sessionId: string, tag: string) => Promise<{ success: boolean; tags?: string[]; error?: string }>
  removeTag: (sessionId: string, tag: string) => Promise<{ success: boolean; tags?: string[]; error?: string }>
  exportCsv: () => Promise<string>
  getHistory: () => Promise<unknown[]>
  getCostReport: () => Promise<CostSummary>
  setBudget: (monthly: number, perSession: number) => Promise<{ success: boolean }>
  setTeamMode: (settings: UserSettings['team']) => Promise<{ success: boolean }>
  getSettings: () => Promise<UserSettings>
  setSetting: (key: string, value: unknown) => Promise<{ success: boolean }>
  addTimelineAnnotation: (sessionId: string, text: string) => Promise<{ success: boolean }>
  onSessionsUpdate: (callback: (sessions: SessionState[]) => void) => (() => void)
  onCostUpdate: (callback: (summary: CostSummary) => void) => (() => void)
  onPeersUpdate: (callback: (peers: PeerState[]) => void) => (() => void)
}

declare global {
  interface Window {
    api: WindowApi
  }
}
