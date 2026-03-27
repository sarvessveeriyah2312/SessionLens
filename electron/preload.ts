import { contextBridge, ipcRenderer } from 'electron'
import type { SessionState, TimelineEvent, CostSummary, PeerState, UserSettings, UpdateInfo } from './types'

const api = {
  // Sessions
  getSessions: (): Promise<SessionState[]> => ipcRenderer.invoke('sessions:get'),

  getTimeline: (sessionId: string, windowHours?: number): Promise<TimelineEvent[]> =>
    ipcRenderer.invoke('sessions:get-timeline', sessionId, windowHours),

  addNote: (sessionId: string, note: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('sessions:add-note', sessionId, note),

  addTag: (
    sessionId: string,
    tag: string
  ): Promise<{ success: boolean; tags?: string[]; error?: string }> =>
    ipcRenderer.invoke('sessions:add-tag', sessionId, tag),

  removeTag: (
    sessionId: string,
    tag: string
  ): Promise<{ success: boolean; tags?: string[]; error?: string }> =>
    ipcRenderer.invoke('sessions:remove-tag', sessionId, tag),

  exportCsv: (): Promise<string> => ipcRenderer.invoke('sessions:export-csv'),

  getHistory: (): Promise<unknown[]> => ipcRenderer.invoke('sessions:get-history'),

  // Cost
  getCostReport: (): Promise<CostSummary> => ipcRenderer.invoke('cost:get-report'),

  setBudget: (
    monthly: number,
    perSession: number
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('cost:set-budget', monthly, perSession),

  // Team
  setTeamMode: (settings: UserSettings['team']): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('team:set-mode', settings),

  // Settings
  getSettings: (): Promise<UserSettings> => ipcRenderer.invoke('settings:get'),

  setSetting: (key: string, value: unknown): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('settings:set', key, value),

  // Timeline annotations
  addTimelineAnnotation: (
    sessionId: string,
    text: string
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('timeline:add-annotation', sessionId, text),

  // Updates
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('updates:get-version'),

  checkForUpdates: (): Promise<UpdateInfo> => ipcRenderer.invoke('updates:check'),

  getReleaseHistory: (): Promise<import('./types').ReleaseInfo[]> => ipcRenderer.invoke('updates:get-history'),

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:open-external', url),

  onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on('updates:available', listener)
    return () => ipcRenderer.removeListener('updates:available', listener)
  },

  // Event listeners
  onSessionsUpdate: (callback: (sessions: SessionState[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, sessions: SessionState[]): void =>
      callback(sessions)
    ipcRenderer.on('sessions:update', listener)
    return () => ipcRenderer.removeListener('sessions:update', listener)
  },

  onCostUpdate: (callback: (summary: CostSummary) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, summary: CostSummary): void =>
      callback(summary)
    ipcRenderer.on('cost:update', listener)
    return () => ipcRenderer.removeListener('cost:update', listener)
  },

  onPeersUpdate: (callback: (peers: PeerState[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, peers: PeerState[]): void =>
      callback(peers)
    ipcRenderer.on('team:peers-update', listener)
    return () => ipcRenderer.removeListener('team:peers-update', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
