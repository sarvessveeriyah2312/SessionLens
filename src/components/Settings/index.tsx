import React, { useState, useEffect, useCallback } from 'react'
import type { UserSettings, UpdateInfo, ReleaseInfo } from '../../../electron/types'

const COLORS = [
  '#00f5ff', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#eab308', '#ef4444'
]

interface SettingsProps {
  onTeamToggle: (enabled: boolean) => void
}

export default function Settings({ onTeamToggle }: SettingsProps): React.JSX.Element {
  const [settings, setSettings] = useState<UserSettings>({
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
  })
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [appVersion, setAppVersion] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [releaseHistory, setReleaseHistory] = useState<ReleaseInfo[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const load = useCallback(async () => {
    try {
      const s = await window.api?.getSettings()
      if (s) setSettings(s)
    } catch {
      // Use defaults
    }
  }, [])

  useEffect(() => {
    load()
    window.api?.getAppVersion?.().then((v) => setAppVersion(v)).catch(() => {})

    // Auto-check on mount — always resolves so badge always shows
    setCheckingUpdate(true)
    window.api?.checkForUpdates?.()
      .then((info) => { if (info) setUpdateInfo(info) })
      .catch(() => {})
      .finally(() => setCheckingUpdate(false))

    // Also accept push from main process (fires ~5s after launch if update found)
    const unsub = window.api?.onUpdateAvailable?.((info) => setUpdateInfo(info))
    return () => unsub?.()
  }, [load])

  const handleOpenHistory = async (): Promise<void> => {
    setShowHistoryModal(true)
    if (releaseHistory.length > 0) return
    setLoadingHistory(true)
    try {
      const history = await window.api.getReleaseHistory()
      setReleaseHistory(history)
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleCheckForUpdates = async (): Promise<void> => {
    setCheckingUpdate(true)
    try {
      const info = await window.api?.checkForUpdates?.()
      if (info) setUpdateInfo(info)
    } catch {
      // ignore
    } finally {
      setCheckingUpdate(false)
    }
  }

  const save = async (): Promise<void> => {
    try {
      await Promise.all([
        window.api?.setSetting('refreshInterval', settings.refreshInterval),
        window.api?.setSetting('timelineRetentionDays', settings.timelineRetentionDays),
        window.api?.setSetting('budget', settings.budget),
        window.api?.setSetting('team', settings.team),
        window.api?.setSetting('notifications', settings.notifications),
        window.api?.setBudget(settings.budget.monthly, settings.budget.perSession),
        window.api?.setTeamMode(settings.team)
      ])
      onTeamToggle(settings.team.enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Silent
    }
  }

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]): void => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const sections = [
    { id: 'general', label: 'General' },
    { id: 'budget', label: 'Budget' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'team', label: 'Team Mode' },
    { id: 'about', label: 'About', badge: updateInfo?.available }
  ]

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0f] to-[#050507]">
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5ff]/50 to-transparent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure SessionLens to match your workflow
            </p>
          </div>
          <button
            onClick={save}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all duration-200
              ${saved 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/40 hover:from-[#00f5ff]/30 hover:to-[#00a3cc]/30'
              }
            `}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Navigation */}
        <div className="w-48 flex-shrink-0 border-r border-[#252a38] bg-[#0c0e16]/30">
          <div className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200
                  ${activeSection === section.id
                    ? 'bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1e2c]'
                  }
                `}
              >
                <span className="font-medium">{section.label}</span>
                {section.badge && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                    Update
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* General Section */}
            {activeSection === 'general' && (
              <Section title="General Settings" description="Configure basic application behavior">
                <Field
                  label="Refresh Interval"
                  hint="How often to poll for session updates"
                >
                  <NumberInput
                    value={settings.refreshInterval}
                    onChange={(v) => update('refreshInterval', v)}
                    min={500}
                    max={30000}
                    step={500}
                    unit="ms"
                  />
                </Field>
                <Field
                  label="Timeline Retention"
                  hint="Days to keep detailed timeline data"
                >
                  <NumberInput
                    value={settings.timelineRetentionDays}
                    onChange={(v) => update('timelineRetentionDays', v)}
                    min={1}
                    max={365}
                    unit="days"
                  />
                </Field>
              </Section>
            )}

            {/* Budget Section */}
            {activeSection === 'budget' && (
              <Section title="Budget Thresholds" description="Set spending limits and alerts">
                <Field
                  label="Monthly Budget"
                  hint="Alert when monthly cost exceeds this amount"
                >
                  <NumberInput
                    value={settings.budget.monthly}
                    onChange={(v) => update('budget', { ...settings.budget, monthly: v })}
                    min={1}
                    max={10000}
                    step={5}
                    unit="$"
                  />
                </Field>
                <Field
                  label="Per-Session Budget"
                  hint="Alert when a single session exceeds this amount"
                >
                  <NumberInput
                    value={settings.budget.perSession}
                    onChange={(v) => update('budget', { ...settings.budget, perSession: v })}
                    min={0.1}
                    max={1000}
                    step={0.5}
                    unit="$"
                  />
                </Field>
                <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <div className="text-xs text-gray-400">
                      Based on your current usage, you're on track to spend ~${
                        (settings.budget.monthly / 30 * 15).toFixed(0)
                      } this month
                  </div>
                </div>
              </Section>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <Section title="Notifications" description="Control when you receive alerts">
                <ToggleField
                  label="Idle Session Alert"
                  value={settings.notifications.idle}
                  onChange={(v) => update('notifications', { ...settings.notifications, idle: v })}
                  hint="Get notified when a session becomes idle"
                />
                <ToggleField
                  label="Session Exit Alert"
                  value={settings.notifications.exit}
                  onChange={(v) => update('notifications', { ...settings.notifications, exit: v })}
                  hint="Get notified when a session ends"
                />
                <ToggleField
                  label="Budget Alert"
                  value={settings.notifications.budget}
                  onChange={(v) => update('notifications', { ...settings.notifications, budget: v })}
                  hint="Get notified when approaching budget limits"
                />
              </Section>
            )}

            {/* Team Mode Section */}
            {activeSection === 'team' && (
              <Section title="Team Mode" description="Share sessions with your team">
                <ToggleField
                  label="Enable Team Mode"
                  value={settings.team.enabled}
                  onChange={(v) => update('team', { ...settings.team, enabled: v })}
                  hint="Share and view sessions across team members"
                />

                {settings.team.enabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-[#252a38] animate-in fade-in duration-200">
                    <Field
                      label="Display Name"
                      hint="Your name shown to teammates"
                    >
                      <input
                        type="text"
                        value={settings.team.displayName}
                        onChange={(e) =>
                          update('team', { ...settings.team, displayName: e.target.value })
                        }
                        className="bg-[#0a0c12] border border-[#252a38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 w-48 transition-all"
                        placeholder="Your name"
                      />
                    </Field>

                    <Field
                      label="Your Color"
                      hint="Your color in team view"
                    >
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => update('team', { ...settings.team, color })}
                            className={`
                              w-8 h-8 rounded-full transition-all duration-200
                              hover:scale-110 hover:shadow-lg
                              ${settings.team.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0c12]' : ''}
                            `}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </Field>

                    <Field
                      label="Sync Mode"
                      hint="How sessions are shared"
                    >
                      <div className="flex gap-2">
                        {(['folder', 'lan'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => update('team', { ...settings.team, mode })}
                            className={`
                              px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                              ${settings.team.mode === mode
                                ? 'bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/40'
                                : 'text-gray-500 border border-[#252a38] hover:border-[#00f5ff]/30 hover:text-gray-300'
                              }
                            `}
                          >
                            {mode === 'folder' ? 'Shared Folder' : 'LAN (mDNS)'}
                          </button>
                        ))}
                      </div>
                    </Field>

                    {settings.team.mode === 'folder' && (
                      <Field
                        label="Shared Folder Path"
                        hint="Folder where peer state files are stored"
                      >
                        <input
                          type="text"
                          value={settings.team.sharedFolderPath}
                          onChange={(e) =>
                            update('team', { ...settings.team, sharedFolderPath: e.target.value })
                          }
                          className="bg-[#0a0c12] border border-[#252a38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 w-full transition-all"
                          placeholder="/Volumes/Shared/sessionlens"
                        />
                      </Field>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* About Section */}
            {activeSection === 'about' && (
              <Section title="About SessionLens" description="Application information">
                <div className="space-y-4">
                  {/* Version card — click to view release history */}
                  <button
                    onClick={handleOpenHistory}
                    className="w-full p-4 bg-gradient-to-br from-[#12141c] to-[#0a0c12] rounded-xl border border-[#252a38] hover:border-[#00f5ff]/40 hover:from-[#12141c] hover:to-[#0d0f1a] flex items-start justify-between gap-4 transition-all duration-200 group text-left"
                  >
                    <div>
                      <div className="text-lg font-semibold text-white">SessionLens</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        v{appVersion || '…'}
                        <span className="ml-2 text-gray-700 group-hover:text-[#00f5ff]/50 transition-colors">
                          · view release history
                        </span>
                      </div>
                    </div>
                    {/* Update status badge — always visible */}
                    <div className="flex-shrink-0">
                      {checkingUpdate ? (
                        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-[#252a38] text-gray-500">
                          <span className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                          Checking…
                        </div>
                      ) : updateInfo ? (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border font-medium ${
                          updateInfo.available
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {updateInfo.available ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              v{updateInfo.latestVersion} available
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Up to date
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </button>

                  {/* Update available banner */}
                  {updateInfo?.available && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-amber-400">
                            Version {updateInfo.latestVersion} is available
                          </div>
                          {updateInfo.publishedAt && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              Released {new Date(updateInfo.publishedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowUpdateModal(true)}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
                        >
                          View Update
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Check for updates button */}
                  <div className="pt-2">
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={checkingUpdate}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-[#252a38] text-gray-400 hover:text-[#00f5ff] hover:border-[#00f5ff]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingUpdate ? (
                        <>
                          <span className="w-3 h-3 border border-[#00f5ff]/50 border-t-[#00f5ff] rounded-full animate-spin" />
                          Checking…
                        </>
                      ) : (
                        'Check for Updates'
                      )}
                    </button>
                    {updateInfo && !updateInfo.available && (
                      <div className="mt-2 text-xs text-emerald-400">
                        You are on the latest version.
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#252a38] text-xs text-gray-600">
                    <p>SessionLens helps you monitor, analyze, and optimize your Claude Code usage.</p>
                    <p className="mt-1">For support or feature requests, please open an issue on GitHub.</p>
                  </div>
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>

      {/* Release History Modal */}
      {showHistoryModal && (
        <ReleaseHistoryModal
          releases={releaseHistory}
          loading={loadingHistory}
          currentVersion={appVersion}
          onClose={() => setShowHistoryModal(false)}
          onOpenRelease={(url) => window.api.openExternal(url)}
        />
      )}

      {/* Update Modal — rendered outside scroll container so backdrop covers full window */}
      {showUpdateModal && updateInfo?.available && (
        <UpdateModal
          info={updateInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  )
}

// ── Release History Modal ────────────────────────────────────────────────────

function ReleaseHistoryModal({
  releases,
  loading,
  currentVersion,
  onClose,
  onOpenRelease
}: {
  releases: ReleaseInfo[]
  loading: boolean
  currentVersion: string
  onClose: () => void
  onOpenRelease: (url: string) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(releases[0]?.version ?? null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#00f5ff]/60 to-transparent" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-shrink-0 border-b border-[#1e2233]">
          <div>
            <div className="text-base font-bold text-white">Release History</div>
            <div className="text-xs text-gray-500 mt-0.5">SessionLens — all versions</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-500 text-sm">
              <span className="w-4 h-4 border border-[#00f5ff]/40 border-t-[#00f5ff] rounded-full animate-spin" />
              Loading releases…
            </div>
          )}

          {!loading && releases.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-600">
              No releases found on GitHub.
            </div>
          )}

          {!loading && releases.map((release) => {
            const isCurrent = release.version === currentVersion
            const isOpen = expanded === release.version
            const changelogLines = release.changelog.split('\n').map((l) => l.trim()).filter(Boolean)

            return (
              <div
                key={release.version}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isCurrent
                    ? 'border-[#00f5ff]/30 bg-[#00f5ff]/5'
                    : 'border-[#1e2233] bg-[#0a0c12]/60'
                }`}
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : release.version)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-semibold ${isCurrent ? 'text-[#00f5ff]' : 'text-white'}`}>
                      v{release.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30 font-medium">
                        current
                      </span>
                    )}
                    {release.publishedAt && (
                      <span className="text-xs text-gray-600">
                        {new Date(release.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenRelease(release.releaseUrl) }}
                      className="text-[10px] text-gray-600 hover:text-[#00f5ff] transition-colors px-2 py-0.5 rounded border border-transparent hover:border-[#00f5ff]/20"
                    >
                      GitHub ↗
                    </button>
                    <span className={`text-gray-600 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {/* Changelog */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#1e2233] space-y-1">
                    {changelogLines.length > 0 ? (
                      changelogLines.map((line, i) => {
                        if (line.startsWith('## ') || line.startsWith('# ')) {
                          return (
                            <div key={i} className="text-xs font-semibold text-[#00f5ff] pt-2 first:pt-0">
                              {line.replace(/^#+\s*/, '')}
                            </div>
                          )
                        }
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return (
                            <div key={i} className="text-xs text-gray-400 flex gap-2">
                              <span className="text-gray-600 flex-shrink-0">·</span>
                              <span>{line.replace(/^[-*]\s*/, '')}</span>
                            </div>
                          )
                        }
                        return <div key={i} className="text-xs text-gray-600">{line}</div>
                      })
                    ) : (
                      <div className="text-xs text-gray-700 italic">No changelog provided.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2233] flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-[#252a38] text-gray-500 hover:text-gray-300 hover:border-[#3a3f54] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Update Modal ─────────────────────────────────────────────────────────────

type DownloadPhase = 'idle' | 'downloading' | 'ready' | 'error'

function UpdateModal({
  info,
  onClose
}: {
  info: UpdateInfo
  onClose: () => void
}): React.JSX.Element {
  const [phase, setPhase] = useState<DownloadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const unsubProgress = window.api.onDownloadProgress((p) => {
      setProgress(p.percent)
      setSpeed(p.bytesPerSecond)
    })
    const unsubDone = window.api.onUpdateDownloaded(() => setPhase('ready'))
    const unsubErr = window.api.onUpdaterError((msg) => {
      setPhase('error')
      setErrorMsg(msg)
    })
    return () => { unsubProgress(); unsubDone(); unsubErr() }
  }, [])

  const handleDownload = async (): Promise<void> => {
    setPhase('downloading')
    setProgress(0)
    const result = await window.api.downloadUpdate()
    if (!result.success) {
      setPhase('error')
      setErrorMsg(result.error ?? 'Download failed')
    }
  }

  const handleInstall = (): void => {
    window.api.installUpdate()
  }

  const changelogLines = info.changelog.split('\n').map((l) => l.trim()).filter(Boolean)

  const formatSpeed = (bps: number): string => {
    if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`
    if (bps > 1_000) return `${(bps / 1_000).toFixed(0)} KB/s`
    return `${bps} B/s`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'downloading') onClose() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-amber-500/60 via-amber-400 to-amber-500/60" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-bold text-white">
              {phase === 'ready' ? 'Ready to Install' : 'Update Available'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              v{info.currentVersion} &rarr; <span className="text-amber-400 font-semibold">v{info.latestVersion}</span>
              {info.publishedAt && (
                <span className="ml-2 text-gray-600">
                  · {new Date(info.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {phase !== 'downloading' && (
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none mt-0.5">
              ✕
            </button>
          )}
        </div>

        {/* Changelog */}
        <div className="px-6 pb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">What&apos;s new</div>
          <div className="bg-[#0a0c12] border border-[#1e2233] rounded-xl p-4 max-h-44 overflow-y-auto space-y-1.5 font-mono text-xs">
            {changelogLines.length > 0 ? changelogLines.map((line, i) => {
              if (line.startsWith('## ') || line.startsWith('# ')) {
                return <div key={i} className="text-[#00f5ff] font-semibold pt-1">{line.replace(/^#+\s*/, '')}</div>
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={i} className="text-gray-300 flex gap-2">
                    <span className="text-amber-400 flex-shrink-0">·</span>
                    <span>{line.replace(/^[-*]\s*/, '')}</span>
                  </div>
                )
              }
              return <div key={i} className="text-gray-500">{line}</div>
            }) : (
              <div className="text-gray-600 italic">No changelog provided.</div>
            )}
          </div>
        </div>

        {/* Download progress bar */}
        {phase === 'downloading' && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Downloading update…</span>
              <span className="font-mono">{progress}% · {formatSpeed(speed)}</span>
            </div>
            <div className="h-2 bg-[#1e2233] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {errorMsg || 'Download failed. Please try again.'}
            </div>
          </div>
        )}

        {/* Ready to install */}
        {phase === 'ready' && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              Download complete. The app will restart to apply the update.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          {phase !== 'downloading' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-[#252a38] text-gray-500 hover:text-gray-300 hover:border-[#3a3f54] transition-all"
            >
              {phase === 'ready' ? 'Later' : 'Skip'}
            </button>
          )}

          {phase === 'idle' && (
            <button
              onClick={handleDownload}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/40 hover:from-amber-500/30 hover:to-amber-600/30 transition-all"
            >
              Download Update
            </button>
          )}

          {phase === 'downloading' && (
            <div className="px-5 py-2 text-sm text-gray-500 flex items-center gap-2">
              <span className="w-3.5 h-3.5 border border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
              Downloading…
            </div>
          )}

          {phase === 'error' && (
            <button
              onClick={handleDownload}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/40 hover:from-amber-500/30 hover:to-amber-600/30 transition-all"
            >
              Retry
            </button>
          )}

          {phase === 'ready' && (
            <button
              onClick={handleInstall}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:from-emerald-500/30 hover:to-emerald-600/30 transition-all"
            >
              Restart &amp; Install
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Enhanced Section Component ──────────────────────────────────────────────

function Section({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c12] border border-[#252a38] rounded-xl overflow-hidden transition-all hover:border-[#00f5ff]/30">
      <div className="px-5 py-4 border-b border-[#252a38] bg-[#0a0c12]/50">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

// ── Enhanced Field Component ────────────────────────────────────────────────

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        {hint && <div className="text-xs text-gray-600 mt-1">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// ── Enhanced Toggle Field ───────────────────────────────────────────────────

function ToggleField({
  label,
  value,
  onChange,
  hint
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  hint: string
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        {hint && <div className="text-xs text-gray-600 mt-1">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-11 h-6 rounded-full transition-all duration-300
          ${value ? 'bg-gradient-to-r from-[#00f5ff] to-[#00a3cc]' : 'bg-[#2a2f42]'}
          focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/50
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300
            ${value ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}

// ── Enhanced Number Input ───────────────────────────────────────────────────

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}): React.JSX.Element {
  const [localValue, setLocalValue] = useState(String(value))

  useEffect(() => {
    setLocalValue(String(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    const v = parseFloat(e.target.value)
    if (!isNaN(v) && v >= min && v <= max) {
      onChange(v)
    }
  }

  const handleBlur = () => {
    let v = parseFloat(localValue)
    if (isNaN(v)) v = min
    v = Math.max(min, Math.min(max, v))
    onChange(v)
    setLocalValue(String(v))
  }

  return (
    <div className="relative">
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        className="bg-[#0a0c12] border border-[#252a38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 w-32 text-right transition-all"
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  )
}