// Database layer — SQLite via Node's built-in node:sqlite (no extra dependency).
// The database file lives next to this file as leads.db and is created on first run.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'leads.db');

export const db = new DatabaseSync(dbPath);

// Pragmas: foreign keys on (future-proofing), WAL mode for safer concurrent reads.
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
  CREATE INDEX IF NOT EXISTS idx_leads_name ON leads (name);
`);

// Seed 3 sample leads on a fresh database so the demo table is not empty.
// (Documented in the README; delete them from the UI or the DB file to start clean.)
const count = db.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO leads (name, email, phone, company, source, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insert.run('Aarav Sharma', 'aarav@acmecorp.in', '+919876543210', 'Acme Corp', 'Website', 'New');
  insert.run('Priya Nair', 'priya@techstart.io', '+919812345678', 'TechStart', 'Referral', 'Contacted');
  insert.run('Rohan Mehta', 'rohan@globex.com', '+917025556677', 'Globex', 'Social Media', 'Qualified');
}

const ALLOWED_SORTS = new Set(['created_at', 'name', 'status', 'company']);

export function listLeads({ search = '', status = '', sort = 'created_at', order = 'desc' } = {}) {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol = ALLOWED_SORTS.has(sort) ? sort : 'created_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';
  // created_at ties (same second) break by id so newest-first is stable.
  const orderBy = sortCol === 'created_at' ? 'created_at DESC, id DESC' : `${sortCol} ${sortDir}, id DESC`;
  return db.prepare(`SELECT * FROM leads ${where} ORDER BY ${orderBy}`).all(...params);
}

export function getLead(id) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id) || null;
}

export function createLead({ name, email, phone, company = '', source, status = 'New' }) {
  const info = db
    .prepare(
      'INSERT INTO leads (name, email, phone, company, source, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name.trim(), email.trim(), phone.trim(), company.trim(), source, status);
  return getLead(info.lastInsertRowid);
}

export function updateLead(id, { name, email, phone, company = '', source, status }) {
  const existing = getLead(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE leads
     SET name = ?, email = ?, phone = ?, company = ?, source = ?, status = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(name.trim(), email.trim(), phone.trim(), company.trim(), source, status, id);
  return getLead(id);
}

export function deleteLead(id) {
  return db.prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0;
}

export function getStats() {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status')
    .all();
  const byStatus = { New: 0, Contacted: 0, Qualified: 0, Lost: 0 };
  for (const row of rows) byStatus[row.status] = row.n;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { total, byStatus };
}
