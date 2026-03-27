import { autoUpdater } from 'electron-updater'
import { ipcMain, BrowserWindow, app, shell } from 'electron'

export function setupAutoUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (channel: string, payload?: unknown): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  autoUpdater.on('update-available', (info) => {
    send('updater:update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    // Suppress errors in dev/unpackaged mode — updater only works in production builds
    if (!err.message.includes('dev-app-update') && !err.message.includes('ENOENT')) {
      send('updater:error', err.message)
    }
  })

  // IPC: trigger download
  ipcMain.handle('updater:download', async (_event, releaseUrl?: string) => {
    if (!app.isPackaged) {
      // Dev mode — electron-updater won't work, open the release page instead
      if (releaseUrl) shell.openExternal(releaseUrl)
      return { success: true, devMode: true }
    }
    try {
      await autoUpdater.checkForUpdates()
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // IPC: quit and install
  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return
    autoUpdater.quitAndInstall()
  })

  // IPC: manual check
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { success: false, devMode: true }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo ?? null }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Run an initial check 5s after launch (production only)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 5_000)
  }
}
