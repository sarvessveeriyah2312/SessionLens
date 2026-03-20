import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import type { PeerState, SessionState, UserSettings } from './types'

export class TeamSync {
  private watcher: ReturnType<typeof chokidar.watch> | null = null
  private peers: Map<string, PeerState> = new Map()
  private settings: UserSettings['team'] | null = null
  private ownDisplayName: string = 'Me'
  private ownColor: string = '#00f5ff'
  private writeTimer: NodeJS.Timeout | null = null
  private staleCheckTimer: NodeJS.Timeout | null = null
  private onPeersChanged: ((peers: PeerState[]) => void) | null = null

  start(
    teamSettings: UserSettings['team'],
    onPeersChanged: (peers: PeerState[]) => void
  ): void {
    this.settings = teamSettings
    this.ownDisplayName = teamSettings.displayName || 'Me'
    this.ownColor = teamSettings.color || '#00f5ff'
    this.onPeersChanged = onPeersChanged

    if (!teamSettings.enabled) return

    if (teamSettings.mode === 'folder' && teamSettings.sharedFolderPath) {
      this.startFolderMode(teamSettings.sharedFolderPath)
    }
  }

  private startFolderMode(folderPath: string): void {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
      }

      this.watcher = chokidar.watch(path.join(folderPath, '*.json'), {
        ignoreInitial: false,
        persistent: true
      })

      this.watcher.on('change', (filePath) => this.readPeerFile(filePath))
      this.watcher.on('add', (filePath) => this.readPeerFile(filePath))

      // Check for stale peers every 30s
      this.staleCheckTimer = setInterval(() => this.checkStale(), 30_000)

      // Initial scan
      this.scanFolder(folderPath)
    } catch (err) {
      console.error('TeamSync: failed to start folder mode', err)
    }
  }

  private scanFolder(folderPath: string): void {
    try {
      const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        this.readPeerFile(path.join(folderPath, file))
      }
    } catch {
      // Silent
    }
  }

  private readPeerFile(filePath: string): void {
    try {
      const ownFile = this.getOwnFileName()
      if (path.basename(filePath) === ownFile) return

      const raw = fs.readFileSync(filePath, 'utf8')
      const state = JSON.parse(raw) as PeerState
      const peerKey = path.basename(filePath, '.json')

      const lastUpdated = new Date(state.lastUpdated)
      const age = Date.now() - lastUpdated.getTime()
      state.isOnline = age < 60_000

      this.peers.set(peerKey, state)
      this.notifyPeers()
    } catch {
      // Silent
    }
  }

  private checkStale(): void {
    let changed = false
    for (const [key, peer] of this.peers.entries()) {
      const age = Date.now() - new Date(peer.lastUpdated).getTime()
      const wasOnline = peer.isOnline
      peer.isOnline = age < 60_000
      if (wasOnline !== peer.isOnline) {
        this.peers.set(key, peer)
        changed = true
      }
    }
    if (changed) this.notifyPeers()
  }

  writeSelf(sessions: SessionState[]): void {
    if (!this.settings?.enabled || this.settings.mode !== 'folder') return
    if (!this.settings.sharedFolderPath) return

    const state: PeerState = {
      user: { name: this.ownDisplayName, color: this.ownColor },
      lastUpdated: new Date().toISOString(),
      sessions,
      isOnline: true
    }

    try {
      const filePath = path.join(this.settings.sharedFolderPath, this.getOwnFileName())
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8')
    } catch {
      // Silent
    }
  }

  private getOwnFileName(): string {
    const safe = this.ownDisplayName.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${safe}.json`
  }

  private notifyPeers(): void {
    if (this.onPeersChanged) {
      this.onPeersChanged(Array.from(this.peers.values()))
    }
  }

  getPeers(): PeerState[] {
    return Array.from(this.peers.values())
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.writeTimer) {
      clearInterval(this.writeTimer)
      this.writeTimer = null
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer)
      this.staleCheckTimer = null
    }
  }

  updateSettings(newSettings: UserSettings['team']): void {
    this.stop()
    this.start(newSettings, this.onPeersChanged!)
  }
}
