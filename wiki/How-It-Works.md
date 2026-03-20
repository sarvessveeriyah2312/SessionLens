# How It Works

SessionLens reads Claude Code's native session files directly from your filesystem:

```bash
~/.claude/sessions/{pid}.json          # Active session metadata
~/.claude/projects/{path}/{id}.jsonl   # Conversation logs with token counts
```

The app watches these files with live file-system events (via [chokidar](https://github.com/paulmillr/chokidar)), so your dashboard updates instantly as you work.

---

## Data Flow

1. **ProcessDetector** — scans `~/.claude/sessions/` for active Claude Code processes
2. **SessionManager** — polls process stats and parses JSONL files for token/cost data; emits events on changes
3. **TimelineRecorder** — persists session snapshots to a local SQLite database at regular intervals
4. **CostCalculator** — computes USD cost estimates based on model pricing and token counts
5. **Main process → Renderer** — pushes live updates to the UI via Electron IPC

All data stays on your machine. There are no outbound network requests.
