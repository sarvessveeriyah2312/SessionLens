/// <reference types="vite/client" />

import type { SessionState, TimelineEvent, CostSummary, PeerState, UserSettings, UpdateInfo, ReleaseInfo } from '../electron/types'

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
  // Updates
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<UpdateInfo>
  getReleaseHistory: () => Promise<ReleaseInfo[]>
  openExternal: (url: string) => Promise<void>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => (() => void)
  downloadUpdate: (releaseUrl?: string) => Promise<{ success: boolean; devMode?: boolean; error?: string }>
  installUpdate: () => Promise<void>
  onDownloadProgress: (callback: (p: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => (() => void)
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => (() => void)
  onUpdaterError: (callback: (msg: string) => void) => (() => void)
}

declare global {
  interface Window {
    api: WindowApi
  }
}
