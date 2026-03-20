import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Analytics from './components/Analytics'
import History from './components/History'
import Team from './components/Team'
import Settings from './components/Settings'
import SessionDetails from './components/SessionDetails'
import type { UserSettings, SessionState } from '../electron/types'

type Tab = 'dashboard' | 'analytics' | 'history' | 'team' | 'settings'

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'analytics', label: 'Analytics', icon: '◉' },
  { id: 'history', label: 'History', icon: '◷' },
  { id: 'team', label: 'Team', icon: '⊞' }
]

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [teamEnabled, setTeamEnabled] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionState | null>(null)

  useEffect(() => {
    window.api?.getSettings().then((s: UserSettings) => {
      setTeamEnabled(s.team?.enabled ?? false)
    }).catch(() => {})
  }, [])

  // Clear selected session when switching away from dashboard
  const handleTabChange = (tab: Tab): void => {
    setSelectedSession(null)
    setActiveTab(tab)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f0f0f]">
      {/* Title bar */}
      <div className="flex items-center justify-between pl-20 pr-4 py-2 bg-[#111] border-b border-[#2a2a2a] drag-region h-10 flex-shrink-0">
        <div className="flex items-center gap-2 no-drag">
          <span className="text-sm font-semibold text-white">SessionLens</span>
        </div>
        <div className="text-xs text-[#606060] no-drag">Session Monitor</div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-[160px] flex-shrink-0 bg-[#111] border-r border-[#2a2a2a] flex flex-col py-4">
          <div className="flex flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => {
              if (item.id === 'team' && !teamEnabled) return null
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-150 text-left ${
                    activeTab === item.id
                      ? 'bg-[rgba(0,245,255,0.1)] text-[#00f5ff] border border-[rgba(0,245,255,0.25)]'
                      : 'text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-auto px-2">
            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-150 text-left ${
                activeTab === 'settings'
                  ? 'bg-[rgba(0,245,255,0.1)] text-[#00f5ff] border border-[rgba(0,245,255,0.25)]'
                  : 'text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <span className="text-base">⚙</span>
              <span>Settings</span>
            </button>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-hidden bg-[#0f0f0f]">
          {selectedSession ? (
            <SessionDetails
              session={selectedSession}
              onBack={() => setSelectedSession(null)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard onSelectSession={setSelectedSession} />
              )}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'history' && <History />}
              {activeTab === 'team' && <Team />}
              {activeTab === 'settings' && (
                <Settings onTeamToggle={(enabled) => setTeamEnabled(enabled)} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
