import React, { useState, useEffect } from 'react'
import type { PeerState, SessionState } from '../../../electron/types'
import { formatDistanceToNow } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  idle: '#eab308',
  exited: '#6b7280',
  completed: '#3b82f6'
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function Team(): React.JSX.Element {
  const [peers, setPeers] = useState<PeerState[]>([])
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.api?.onPeersUpdate((updated) => {
      setPeers(updated)
      if (updated.length > 0 && !selectedPeer) {
        setSelectedPeer(updated[0].user.name)
      }
    })
    return () => unsub?.()
  }, [selectedPeer])

  const totalCostToday = peers
    .filter((p) => p.isOnline)
    .flatMap((p) => p.sessions)
    .reduce((sum, s) => sum + s.costUsd, 0)

  const totalActiveSessions = peers
    .filter((p) => p.isOnline)
    .flatMap((p) => p.sessions)
    .filter((s) => s.status === 'active').length

  const selectedPeerData = peers.find((p) => p.user.name === selectedPeer)
  const allSessions: Array<SessionState & { peerName: string; peerColor: string }> = peers.flatMap(
    (p) =>
      p.sessions.map((s) => ({
        ...s,
        peerName: p.user.name,
        peerColor: p.user.color
      }))
  )

  if (peers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#404040]">
        <div className="text-4xl mb-3">⊞</div>
        <div className="text-sm">No team peers connected</div>
        <div className="text-xs mt-2 text-[#333]">
          Configure a shared folder in Settings to enable team mode
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - peer list */}
      <div className="w-[200px] flex-shrink-0 border-r border-[#2a2a2a] bg-[#111] p-3">
        <div className="text-xs text-[#606060] uppercase tracking-wide mb-3">Team Members</div>

        {/* Aggregate */}
        <div className="glass-card p-2 mb-3">
          <div className="text-[10px] text-[#606060] mb-1">Team Today</div>
          <div className="text-sm text-[#00f5ff] font-semibold">${totalCostToday.toFixed(2)}</div>
          <div className="text-xs text-[#606060]">{totalActiveSessions} active sessions</div>
        </div>

        <div className="space-y-1">
          {peers.map((peer) => (
            <button
              key={peer.user.name}
              onClick={() => setSelectedPeer(peer.user.name)}
              className={`w-full flex items-center gap-2 p-2 rounded text-left transition-all ${
                selectedPeer === peer.user.name
                  ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                  : 'hover:bg-[#1a1a1a]'
              } ${!peer.isOnline ? 'opacity-50' : ''}`}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: peer.isOnline ? peer.user.color : '#6b7280'
                }}
              />
              <div className="min-w-0">
                <div className="text-xs text-white font-medium truncate">{peer.user.name}</div>
                <div className="text-[10px] text-[#606060]">
                  {peer.isOnline
                    ? `${peer.sessions.filter((s) => s.status === 'active').length} active`
                    : `offline ${formatDistanceToNow(new Date(peer.lastUpdated), { addSuffix: true })}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main - sessions table */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <div className="text-sm font-semibold text-white">
            {selectedPeerData
              ? `${selectedPeerData.user.name}'s Sessions`
              : 'All Team Sessions'}
          </div>
          <div className="text-xs text-[#606060]">
            {(selectedPeerData?.sessions || allSessions).length} sessions
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-[#606060]">
              <th className="text-left px-4 py-2 font-medium">Member</th>
              <th className="text-left px-4 py-2 font-medium">Project</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Cost</th>
              <th className="text-right px-4 py-2 font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {(selectedPeerData
              ? selectedPeerData.sessions.map((s) => ({
                  ...s,
                  peerName: selectedPeerData.user.name,
                  peerColor: selectedPeerData.user.color
                }))
              : allSessions
            ).map((session, i) => (
              <tr
                key={`${session.id}-${i}`}
                className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: session.peerColor }}
                    />
                    <span style={{ color: session.peerColor }}>{session.peerName}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-white">{session.projectName}</div>
                  <div className="text-[#404040] font-mono truncate max-w-[200px]">
                    {session.projectPath}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      color: STATUS_COLORS[session.status] || '#6b7280',
                      backgroundColor: `${STATUS_COLORS[session.status] || '#6b7280'}20`
                    }}
                  >
                    {session.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-[#00f5ff] font-mono">
                  ${session.costUsd.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-[#a0a0a0] font-mono">
                  {formatTokens(session.tokensInput + session.tokensOutput)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
