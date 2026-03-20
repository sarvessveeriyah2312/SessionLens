import React, { useState, useEffect, useCallback } from 'react'
import type { UserSettings } from '../../../electron/types'

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
  }, [load])

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
    { id: 'about', label: 'About' }
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
                  w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200
                  ${activeSection === section.id
                    ? 'bg-gradient-to-r from-[#00f5ff]/20 to-[#00a3cc]/20 text-[#00f5ff] border border-[#00f5ff]/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1e2c]'
                  }
                `}
              >
                <span className="font-medium">{section.label}</span>
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
                  <div className="p-4 bg-gradient-to-br from-[#12141c] to-[#0a0c12] rounded-xl border border-[#252a38]">
                    <div className="text-lg font-semibold text-white">SessionLens</div>
                    <div className="text-xs text-gray-500 mt-1">Version 2.0.0</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Monitors Claude Code sessions in real time</div>
                    <div className="text-sm text-gray-400">Data stored locally in SQLite</div>
                    <div className="text-sm text-gray-400">No data sent to any external servers</div>
                    <div className="text-sm text-gray-400">Real-time analytics and cost tracking</div>
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