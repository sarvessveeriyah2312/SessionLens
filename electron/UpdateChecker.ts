import { app } from 'electron'
import { request } from 'https'
import type { UpdateInfo, ReleaseInfo } from './types'

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  published_at: string
}

const REPO = 'sarvessveeriyah2312/sessionlens'

function fetchJSON<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: 'api.github.com',
        path,
        method: 'GET',
        headers: {
          'User-Agent': 'SessionLens-App',
          Accept: 'application/vnd.github.v3+json'
        }
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: string) => { data += chunk })
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data) as T)
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          } catch {
            reject(new Error('Invalid JSON response'))
          }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error('Request timed out')) })
    req.end()
  })
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string): number[] => v.replace(/^v/, '').split('.').map(Number)
  const [la, lb, lc] = parse(latest)
  const [ca, cb, cc] = parse(current)
  if (la !== ca) return la > ca
  if (lb !== cb) return lb > cb
  return lc > cc
}

export async function fetchReleaseHistory(): Promise<ReleaseInfo[]> {
  try {
    const releases = await fetchJSON<GitHubRelease[]>(`/repos/${REPO}/releases?per_page=20`)
    return releases.map((r) => ({
      version: r.tag_name.replace(/^v/, ''),
      name: r.name ?? r.tag_name,
      changelog: r.body ?? '',
      releaseUrl: r.html_url,
      publishedAt: r.published_at
    }))
  } catch {
    return []
  }
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()
  try {
    const release = await fetchJSON<GitHubRelease>(`/repos/${REPO}/releases/latest`)
    const latestVersion = release.tag_name.replace(/^v/, '')
    return {
      available: isNewer(latestVersion, currentVersion),
      currentVersion,
      latestVersion,
      changelog: release.body ?? '',
      releaseUrl: release.html_url,
      publishedAt: release.published_at
    }
  } catch {
    return {
      available: false,
      currentVersion,
      latestVersion: currentVersion,
      changelog: '',
      releaseUrl: '',
      publishedAt: ''
    }
  }
}
