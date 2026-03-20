import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import notifier from 'node-notifier'
import { SessionManager } from './SessionManager'
import { TimelineRecorder } from './TimelineRecorder'
import { CostCalculator } from './CostCalculator'
import { TeamSync } from './TeamSync'
import {
  setSessionNote,
  setSessionTags,
  getSessionAnnotation,
  getAllSessions,
  pruneOldTimeline
} from './database'
import type { UserSettings, SessionState } from './types'

// ---- Store ----
const store = new Store<UserSettings>({
  defaults: {
    refreshInterval: 2000,
    timelineRetentionDays: 30,
    budget: { monthly: 100, perSession: 10 },
    team: {
      enabled: false,
      mode: 'folder',
      sharedFolderPath: '',
      displayName: 'Me',
      color: '#00f5ff'
    },
    notifications: { idle: true, exit: true, budget: true }
  }
})

// ---- Services ----
const sessionManager = new SessionManager()
const timelineRecorder = new TimelineRecorder()
const costCalculator = new CostCalculator()
const teamSync = new TeamSync()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTrayIcon(): nativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      buf[i] = 0
      buf[i + 1] = 245
      buf[i + 2] = 255
      buf[i + 3] = 255
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function createWindow(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = createTrayIcon()
  tray = new Tray(icon)

  const menu = Menu.buildFromTemplate([
    {
      label: 'SessionLens',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(menu)
  tray.setToolTip('SessionLens')

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
}

function setupIPC(): void {
  // Get sessions
  ipcMain.handle('sessions:get', () => {
    return sessionManager.getSessions()
  })

  // Get timeline — try DB first, fall back to parsing the raw JONL
  ipcMain.handle('sessions:get-timeline', async (_event, sessionId: string, windowHours: number = 1) => {
    const dbRows = timelineRecorder.getTimeline(sessionId, windowHours)
    if (dbRows.length > 0) return dbRows

    // No DB rows yet — build directly from the JONL file
    const session = sessionManager.getSessions().find((s) => s.id === sessionId)
    if (!session) return []
    return timelineRecorder.buildTimelineFromJonl(session.projectPath, sessionId, windowHours)
  })

  // Add note
  ipcMain.handle('sessions:add-note', (_event, sessionId: string, note: string) => {
    try {
      setSessionNote(sessionId, note)
      sessionManager.setNote(sessionId, note)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Add tag
  ipcMain.handle('sessions:add-tag', (_event, sessionId: string, tag: string) => {
    try {
      const current = getSessionAnnotation(sessionId)
      const tags = [...new Set([...current.tags, tag])]
      setSessionTags(sessionId, tags)
      sessionManager.addTag(sessionId, tag)
      return { success: true, tags }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Remove tag
  ipcMain.handle('sessions:remove-tag', (_event, sessionId: string, tag: string) => {
    try {
      const current = getSessionAnnotation(sessionId)
      const tags = current.tags.filter((t: string) => t !== tag)
      setSessionTags(sessionId, tags)
      sessionManager.removeTag(sessionId, tag)
      return { success: true, tags }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Export CSV
  ipcMain.handle('sessions:export-csv', () => {
    try {
      const allSessions = getAllSessions()
      const header = 'id,projectName,projectPath,status,startTime,costUsd,tokensInput,tokensOutput,tokensCache,model'
      const rows = allSessions.map((s) => [
        s.id,
        `"${s.project_name}"`,
        `"${s.project_path}"`,
        s.status,
        new Date(s.start_time).toISOString(),
        s.cost_usd.toFixed(4),
        s.tokens_input,
        s.tokens_output,
        s.tokens_cache,
        s.model
      ].join(','))
      return [header, ...rows].join('\n')
    } catch (err) {
      return ''
    }
  })

  // Cost report
  ipcMain.handle('cost:get-report', () => {
    const sessions = sessionManager.getSessions()
    return costCalculator.computeSummary(sessions)
  })

  // Set budget
  ipcMain.handle('cost:set-budget', (_event, monthly: number, perSession: number) => {
    costCalculator.setBudgets(monthly, perSession)
    const settings = store.get('budget') as { monthly: number; perSession: number }
    store.set('budget', { ...settings, monthly, perSession })
    return { success: true }
  })

  // Team set mode
  ipcMain.handle('team:set-mode', (_event, teamSettings: UserSettings['team']) => {
    store.set('team', teamSettings)
    teamSync.updateSettings(teamSettings)
    return { success: true }
  })

  // Settings get
  ipcMain.handle('settings:get', () => {
    return store.store
  })

  // Settings set
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    store.set(key as keyof UserSettings, value as UserSettings[keyof UserSettings])
    return { success: true }
  })

  // History sessions
  ipcMain.handle('sessions:get-history', () => {
    try {
      return getAllSessions()
    } catch {
      return []
    }
  })

  // Add annotation to timeline
  ipcMain.handle('timeline:add-annotation', (_event, sessionId: string, text: string) => {
    timelineRecorder.addAnnotation(sessionId, text)
    return { success: true }
  })
}

function isWindowAlive(): boolean {
  return !!mainWindow && !mainWindow.isDestroyed() && !!mainWindow.webContents
}

function startPushUpdates(): void {
  sessionManager.on('sessions-updated', (sessions: SessionState[]) => {
    if (isWindowAlive()) {
      mainWindow!.webContents.send('sessions:update', sessions)
    }

    // Push cost update
    const summary = costCalculator.computeSummary(sessions)
    if (isWindowAlive()) {
      mainWindow!.webContents.send('cost:update', summary)
    }

    // Team sync write
    teamSync.writeSelf(sessions)

    // Cost alerts
    const settings = store.get('notifications') as UserSettings['notifications']
    if (settings.budget) {
      costCalculator.onAlert((type, value, limit) => {
        notifier.notify({
          title: 'SessionLens - Budget Alert',
          message: `${type}: $${value.toFixed(2)} / $${limit.toFixed(2)}`,
          sound: false
        })
      })
      costCalculator.checkAlerts(sessions, summary)
    }

    // Session state notifications
    if (settings.idle || settings.exit) {
      for (const session of sessions) {
        if (settings.idle && session.status === 'idle') {
          // (Could track idle notifications per session to avoid spam)
        }
        if (settings.exit && session.status === 'exited') {
          // (Could track exit notifications per session)
        }
      }
    }
  })

  teamSync.start(store.get('team') as UserSettings['team'], (peers) => {
    if (isWindowAlive()) {
      mainWindow!.webContents.send('team:peers-update', peers)
    }
  })
}

// ---- App lifecycle ----
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sessionlens.app')

  if (process.platform === 'darwin') {
    app.dock.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPC()
  createWindow()
  createTray()

  const settings = store.store
  costCalculator.setBudgets(settings.budget.monthly, settings.budget.perSession)

  sessionManager.start(settings.refreshInterval)
  timelineRecorder.start(() => sessionManager.getSessions(), 30_000)
  startPushUpdates()

  // Prune old timeline data periodically
  setInterval(
    () => pruneOldTimeline(settings.timelineRetentionDays),
    60 * 60 * 1000 // hourly
  )

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('[SessionLens] Unhandled rejection:', reason)
})

app.on('before-quit', () => {
  sessionManager.stop()
  timelineRecorder.stop()
  teamSync.stop()
})
