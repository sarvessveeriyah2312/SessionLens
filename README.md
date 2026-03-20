<div align="center">

# 🔍 SessionLens

### Real-time monitor for Claude Code sessions

Track costs, tokens, timelines, and activity across all your AI coding sessions from a single desktop app.

[![Release](https://img.shields.io/github/v/release/sarvessveeriyah2312/SessionLens?style=for-the-badge&color=00f5ff&logo=github&logoColor=white)](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/sarvessveeriyah2312/SessionLens/release.yml?style=for-the-badge&label=build&logo=githubactions&logoColor=white)](https://github.com/sarvessveeriyah2312/SessionLens/actions/workflows/release.yml)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge&logo=electron&logoColor=white)](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest)
[![License](https://img.shields.io/github/license/sarvessveeriyah2312/SessionLens?style=for-the-badge&color=blue)](LICENSE)

</div>

---

## 📦 Download

Get the latest release for your platform:

<div align="center">

| Platform | Download |
|----------|----------|
| 🍎 **macOS** (Intel + Apple Silicon) | [SessionLens.dmg](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |
| 🪟 **Windows** | [SessionLens-Setup.exe](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |
| 🐧 **Linux** | [SessionLens.AppImage](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) / [.deb](https://github.com/sarvessveeriyah2312/SessionLens/releases/latest) |

</div>

> All releases are available on the [Releases page](https://github.com/sarvessveeriyah2312/SessionLens/releases).

---

## ✨ Features

<div align="center">
<table>
<tr>
<td width="50%">

### 🎯 **Live Dashboard**
- View all active, idle, and exited sessions at a glance
- Real-time updates with file-system watching
- Quick status indicators and session controls

</td>
<td width="50%">

### 📊 **Session Details**
- Full timeline view of conversations
- Token breakdown by model and role
- Cost analysis with per-session metrics

</td>
</tr>
<tr>
<td width="50%">

### 💰 **Cost Tracking**
- Real-time USD cost estimates
- Monthly budget alerts
- Per-session spending limits

</td>
<td width="50%">

### 📈 **Analytics**
- Daily spend charts
- Token usage trends
- Model distribution visualizations
- Cache efficiency metrics

</td>
</tr>
<tr>
<td width="50%">

### 📜 **History & Export**
- Searchable session archive
- CSV export for all sessions
- Filter by date, model, or tags

</td>
<td width="50%">

### 🏷️ **Organization**
- Add notes to any session
- Custom tags for categorization
- Full-text search across notes

</td>
</tr>
</table>
</div>

### 🔒 Privacy First
> **No cloud, no tracking** — all data stored locally in SQLite. Nothing is ever sent to external servers.

---

## ⚙️ How It Works

SessionLens reads Claude Code's native session files directly from your filesystem:

```bash
~/.claude/sessions/{pid}.json          # Active session metadata
~/.claude/projects/{path}/{id}.jsonl   # Conversation logs with token counts
```

The app watches these files with live file-system events, so your dashboard updates instantly as you work. No configuration needed — just install and go.

---

## 🚀 Quick Start

### Installation

1. Download the installer for your platform from [Releases](https://github.com/sarvessveeriyah2312/SessionLens/releases)
2. Install and launch SessionLens
3. Start using Claude Code — your sessions will appear automatically

### Development Setup

```bash
# Clone the repository
git clone https://github.com/sarvessveeriyah2312/SessionLens.git
cd SessionLens

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist:mac     # macOS DMG
npm run dist:win     # Windows NSIS installer
npm run dist:linux   # Linux AppImage + deb
```

---

## 🔧 Tech Stack

<div align="center">

| Layer | Technology | Icon |
|-------|-----------|------|
| **Desktop Shell** | Electron 31 | ⚛️ |
| **UI Framework** | React 18 + TypeScript | 🎨 |
| **Build Tool** | electron-vite + Vite 5 | ⚡ |
| **Packaging** | electron-builder 24 | 📦 |
| **Styling** | Tailwind CSS | 🎭 |
| **Charts** | Recharts | 📊 |
| **Storage** | better-sqlite3 (SQLite) | 🗄️ |
| **File Watching** | chokidar | 👁️ |
| **CI/CD** | GitHub Actions + semantic-release | 🤖 |

</div>

---

## 📝 Versioning & Releases

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning. Every push to `main` is analyzed and a new version is published automatically when releasable commits are detected.

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Release Type | Example |
|--------|-------------|---------|
| `fix:` | Patch `1.0.x` | `fix: resolve session loading error` |
| `feat:` | Minor `1.x.0` | `feat: add export to CSV feature` |
| `feat!:` or `BREAKING CHANGE:` | Major `x.0.0` | `feat!: redesign data storage layer` |
| `chore:`, `docs:`, `style:` | No release | `docs: update installation guide` |

---

## 📄 Changelog

See the full version history on the [GitHub Releases page](https://github.com/sarvessveeriyah2312/SessionLens/releases).

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**Made with ❤️ for the Claude Code community**

[Report Bug](https://github.com/sarvessveeriyah2312/SessionLens/issues) · [Request Feature](https://github.com/sarvessveeriyah2312/SessionLens/issues) · [Star on GitHub](https://github.com/sarvessveeriyah2312/SessionLens)

</div>
