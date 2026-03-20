import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { SessionState, TimelineEvent } from './types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'sessionlens.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      pid INTEGER,
      project_name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_time INTEGER NOT NULL,
      last_activity INTEGER NOT NULL,
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
      cost_usd REAL NOT NULL DEFAULT 0,
      tokens_input INTEGER NOT NULL DEFAULT 0,
      tokens_output INTEGER NOT NULL DEFAULT 0,
      tokens_cache INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      tokens_input INTEGER NOT NULL DEFAULT 0,
      tokens_output INTEGER NOT NULL DEFAULT 0,
      tokens_cache INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'active',
      annotation_text TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_annotations (
      session_id TEXT PRIMARY KEY,
      note TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#00f5ff',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_timeline_session_id ON timeline_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON timeline_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
  `)
}

export function upsertSession(session: SessionState): void {
  const database = getDb()
  const stmt = database.prepare(`
    INSERT INTO sessions (id, pid, project_name, project_path, status, start_time, last_activity, model, cost_usd, tokens_input, tokens_output, tokens_cache, updated_at)
    VALUES (@id, @pid, @projectName, @projectPath, @status, @startTime, @lastActivity, @model, @costUsd, @tokensInput, @tokensOutput, @tokensCache, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      pid = excluded.pid,
      status = excluded.status,
      last_activity = excluded.last_activity,
      cost_usd = excluded.cost_usd,
      tokens_input = excluded.tokens_input,
      tokens_output = excluded.tokens_output,
      tokens_cache = excluded.tokens_cache,
      updated_at = datetime('now')
  `)
  stmt.run({
    id: session.id,
    pid: session.pid,
    projectName: session.projectName,
    projectPath: session.projectPath,
    status: session.status,
    startTime: session.startTime,
    lastActivity: session.lastActivity,
    model: session.model,
    costUsd: session.costUsd,
    tokensInput: session.tokensInput,
    tokensOutput: session.tokensOutput,
    tokensCache: session.tokensCache
  })

  // Upsert annotation row
  const annotStmt = database.prepare(`
    INSERT INTO session_annotations (session_id, note, tags_json)
    VALUES (@sessionId, '', '[]')
    ON CONFLICT(session_id) DO NOTHING
  `)
  annotStmt.run({ sessionId: session.id })
}

export function getSessionAnnotation(sessionId: string): { note: string; tags: string[] } {
  const database = getDb()
  const row = database
    .prepare('SELECT note, tags_json FROM session_annotations WHERE session_id = ?')
    .get(sessionId) as { note: string; tags_json: string } | undefined

  if (!row) return { note: '', tags: [] }
  return { note: row.note, tags: JSON.parse(row.tags_json) }
}

export function setSessionNote(sessionId: string, note: string): void {
  const database = getDb()
  database
    .prepare(
      `UPDATE session_annotations SET note = ?, updated_at = datetime('now') WHERE session_id = ?`
    )
    .run(note, sessionId)
}

export function setSessionTags(sessionId: string, tags: string[]): void {
  const database = getDb()
  database
    .prepare(
      `UPDATE session_annotations SET tags_json = ?, updated_at = datetime('now') WHERE session_id = ?`
    )
    .run(JSON.stringify(tags), sessionId)
}

export function insertTimelineEvent(event: TimelineEvent): void {
  const database = getDb()
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO timeline_events (id, session_id, timestamp, event_type, tokens_input, tokens_output, tokens_cache, state, annotation_text)
    VALUES (@id, @sessionId, @timestamp, @eventType, @tokensInput, @tokensOutput, @tokensCache, @state, @annotationText)
  `)
  stmt.run({
    id: event.id,
    sessionId: event.sessionId,
    timestamp: event.timestamp,
    eventType: event.eventType,
    tokensInput: event.tokensInput,
    tokensOutput: event.tokensOutput,
    tokensCache: event.tokensCache,
    state: event.state,
    annotationText: event.annotationText ?? null
  })
}

export function getTimelineEvents(sessionId: string, since?: string): TimelineEvent[] {
  const database = getDb()
  let query = 'SELECT * FROM timeline_events WHERE session_id = ?'
  const params: unknown[] = [sessionId]

  if (since) {
    query += ' AND timestamp >= ?'
    params.push(since)
  }

  query += ' ORDER BY timestamp ASC'

  const rows = database.prepare(query).all(...params) as Array<{
    id: string
    session_id: string
    timestamp: string
    event_type: string
    tokens_input: number
    tokens_output: number
    tokens_cache: number
    state: string
    annotation_text: string | null
  }>

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    timestamp: row.timestamp,
    eventType: row.event_type as TimelineEvent['eventType'],
    tokensInput: row.tokens_input,
    tokensOutput: row.tokens_output,
    tokensCache: row.tokens_cache,
    state: row.state as TimelineEvent['state'],
    annotationText: row.annotation_text ?? undefined
  }))
}

export function getAllSessions(): Array<{
  id: string
  pid: number
  project_name: string
  project_path: string
  status: string
  start_time: number
  last_activity: number
  model: string
  cost_usd: number
  tokens_input: number
  tokens_output: number
  tokens_cache: number
  created_at: string
}> {
  const database = getDb()
  return database.prepare('SELECT * FROM sessions ORDER BY start_time DESC').all() as ReturnType<
    typeof getAllSessions
  >
}

export function getCostsByDateRange(
  startDate: string,
  endDate: string
): Array<{ date: string; total: number; project_name: string; model: string }> {
  const database = getDb()
  return database
    .prepare(
      `
    SELECT
      date(datetime(start_time / 1000, 'unixepoch')) as date,
      project_name,
      model,
      SUM(cost_usd) as total
    FROM sessions
    WHERE date(datetime(start_time / 1000, 'unixepoch')) BETWEEN ? AND ?
    GROUP BY date, project_name, model
    ORDER BY date ASC
  `
    )
    .all(startDate, endDate) as ReturnType<typeof getCostsByDateRange>
}

export function pruneOldTimeline(retentionDays: number): void {
  const database = getDb()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  database
    .prepare(`DELETE FROM timeline_events WHERE timestamp < ?`)
    .run(cutoff.toISOString())
}

export function getAllTags(): Array<{ id: number; name: string; color: string }> {
  const database = getDb()
  return database.prepare('SELECT * FROM tags ORDER BY name ASC').all() as ReturnType<
    typeof getAllTags
  >
}

export function upsertTag(name: string, color: string): void {
  const database = getDb()
  database
    .prepare(
      `INSERT INTO tags (name, color) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET color = excluded.color`
    )
    .run(name, color)
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
