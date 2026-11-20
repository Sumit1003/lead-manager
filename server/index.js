// Lead Manager API — Express + SQLite.
// REST endpoints:
//   GET    /api/health        -> { status: 'ok' }
//   GET    /api/leads         -> list (query: search, status, sort, order)
//   GET    /api/leads/stats   -> { total, byStatus: { New, Contacted, Qualified, Lost } }
//   GET    /api/leads/:id     -> one lead
//   POST   /api/leads         -> create (201), 400 on validation errors
//   PUT    /api/leads/:id     -> full update, 404 if missing
//   DELETE /api/leads/:id     -> 204, 404 if missing
//
// In production (NODE_ENV=production) the built React app in ../client/dist
// is served from the same server, so one deployment hosts everything.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getStats,
} from './db.js';
import { validateLead, SOURCES, STATUSES } from './validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---- API routes ----
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Meta endpoint so the frontend can populate its dropdowns from one place.
app.get('/api/meta', (req, res) => res.json({ sources: SOURCES, statuses: STATUSES }));

app.get('/api/leads/stats', (req, res) => res.json(getStats()));

app.get('/api/leads', (req, res) => {
  const { search = '', status = '', sort = 'created_at', order = 'desc' } = req.query;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `Unknown status: ${status}` });
  }
  res.json(listLeads({ search, status, sort, order }));
});

app.get('/api/leads/:id', (req, res) => {
  const lead = getLead(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  res.json(lead);
});

app.post('/api/leads', (req, res) => {
  const errors = validateLead(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed.', errors });
  }
  const lead = createLead(req.body);
  res.status(201).json(lead);
});

app.put('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getLead(id)) return res.status(404).json({ error: 'Lead not found.' });
  const errors = validateLead(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed.', errors });
  }
  res.json(updateLead(id, req.body));
});

app.delete('/api/leads/:id', (req, res) => {
  const deleted = deleteLead(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Lead not found.' });
  res.status(204).send();
});

// ---- Static frontend (production only) ----
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    // SPA fallback: any non-API route serves the React app.
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

// ---- Error handling ----
// Bad JSON bodies land here (express.json throws a SyntaxError).
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Lead Manager API listening on http://localhost:${PORT}`);
});
