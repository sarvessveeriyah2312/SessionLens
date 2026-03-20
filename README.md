# SessionLens

> Real-time monitor for Claude Code sessions — track costs, tokens, timelines, and activity across all your AI coding sessions from a single desktop app.

[![Release](https://img.shields.io/github/v/release/sarvessveeriyah2312/SessionLens?style=flat-square&color=00f5ff)](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/sarvessveeriyah2312/SessionLens/release.yml?style=flat-square&label=build)](https://github.com/sarvessveeriyah2312/SessionLens/actions/workflows/release.yml)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square)](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest)
[![License](https://img.shields.io/github/license/sarvessveeriyah2312/SessionLens?style=flat-square)](LICENSE)

---

## Download

Get the latest release for your platform:

| Platform | Download |
|----------|----------|
| **macOS** (Intel + Apple Silicon) | [SessionLens.dmg](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |
| **Windows** | [SessionLens-Setup.exe](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |
| **Linux** | [SessionLens.AppImage](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) / [.deb](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |

> All releases are on the [Releases page](https://github.com/sarvessveeriyah2312/SessionLens/releases).

---

## Features

- **Live Dashboard** — see all active, idle, and exited Claude Code sessions at a glance
- **Session Details** — drill into any session for full timeline, token breakdown, and cost analysis
- **Cost Tracking** — real-time USD cost estimates with monthly and per-session budget alerts
- **Analytics** — charts for daily spend, token usage, model distribution, and cache efficiency
- **History** — searchable log of all past sessions with CSV export
- **Notes & Tags** — annotate sessions with notes and tags for organisation
- **No cloud** — all data stored locally in SQLite, nothing sent to external servers

---

## How It Works

SessionLens reads Claude Code's native session files directly from your filesystem:

```
~/.claude/sessions/{pid}.json          — active session metadata
~/.claude/projects/{path}/{id}.jsonl   — conversation logs with token counts
```

It watches these files with live file-system events so the dashboard updates instantly as you work.

---

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
git clone https://github.com/sarvessveeriyah2312/SessionLens.git
cd SessionLens
npm install
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
# Current platform only
npm run build

# Package for distribution
npm run dist:mac     # macOS DMG
npm run dist:win     # Windows NSIS installer
npm run dist:linux   # Linux AppImage + deb
```

---

## Releases

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/). Every push to `main` is analysed and a new version is published automatically when releasable commits are detected.

### Commit format

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Release type |
|--------|-------------|
| `fix: ...` | Patch `1.0.x` |
| `feat: ...` | Minor `1.x.0` |
| `feat!:` or `BREAKING CHANGE:` | Major `x.0.0` |
| `chore:`, `docs:`, `style:` | No release |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

### Latest — v1.1.0

- Automated versioning and releases via semantic-release
- CI/CD pipeline with builds for macOS, Windows, and Linux

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 31 |
| UI | React 18 + TypeScript |
| Build | electron-vite + Vite 5 |
| Packaging | electron-builder 24 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Storage | better-sqlite3 (SQLite) |
| File watching | chokidar |
| CI/CD | GitHub Actions + semantic-release |

---

## License

MIT
