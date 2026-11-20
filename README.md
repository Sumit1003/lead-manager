# Lead Manager

A small full-stack web app to capture and track sales leads — built for the
**Meru Technosoft Pvt. Ltd. Full Stack Developer screening assignment**.

A sales user can add leads (name, email, phone, company, source, status),
view them in a table, edit them, delete them (with confirmation), and
search / filter by name or status. A small dashboard shows total leads per
status.

**Live demo:** _(link added after deployment — see below)_

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + Vite | Required by the brief; fast dev server, tiny build |
| Backend | Node.js + Express 4 | Required by the brief; small, readable REST API |
| Database | SQLite (`node:sqlite`) | Allowed by the brief ("PostgreSQL, MongoDB, or SQLite"). Zero setup — no server to install, the DB is a single file. The schema is one table, so moving to MongoDB later is a small change |

No frontend UI library is used — plain React + CSS, so every line is easy to
explain. No auth is implemented (listed under "what I'd improve").

## Run it locally

You need Node.js 22+ (uses the built-in `node:sqlite` module).

```bash
# 1. Backend (terminal 1) — http://localhost:5000
cd server
npm install
npm start

# 2. Frontend (terminal 2) — http://localhost:5173
cd client
npm install
npm run dev
```

Or run everything from **one** server (production mode — the Express server
serves the built React app on the same port):

```bash
cd client && npm install && npm run build && cd ..
cd server && npm install && NODE_ENV=production npm start
# open http://localhost:5000
```

On first run the database is seeded with 3 sample leads so the table is not
empty. Delete them from the UI (or delete `server/leads.db`) to start clean.

## API

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | `{ status: "ok" }` |
| GET | `/meta` | Allowed `sources` and `statuses` for the dropdowns |
| GET | `/leads` | List leads. Query: `search` (name/email/company), `status`, `sort` (`created_at`/`name`/`status`), `order` (`asc`/`desc`) |
| GET | `/leads/stats` | `{ total, byStatus: { New, Contacted, Qualified, Lost } }` |
| GET | `/leads/:id` | One lead (404 if missing) |
| POST | `/leads` | Create a lead (201). 400 with per-field `errors` on bad input |
| PUT | `/leads/:id` | Full update (404 if missing) |
| DELETE | `/leads/:id` | Delete (204, 404 if missing) |

Validation (both frontend and backend): name ≥ 2 chars, valid email,
phone 7–15 digits (optional leading `+`), source and status must be from the
allowed lists. Company is optional.

## Project structure

```
lead-manager/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── api.js        # fetch wrapper for the API
│   │   ├── App.jsx       # dashboard, form, table, delete confirm
│   │   ├── App.css       # all styling
│   │   └── main.jsx      # entry point
│   └── vite.config.js    # dev proxy: /api -> localhost:5000
├── server/               # Express + SQLite backend
│   ├── index.js          # routes, error handling, static serving
│   ├── db.js             # schema, seed data, all SQL queries
│   └── validate.js       # shared validation rules
└── .env.example          # config template (PORT, DB_PATH)
```

## Assumptions

- **Company is optional** — a lead can exist without a company name.
- **One user, no login** — the brief's auth is a bonus; the app is a
  single-user tool, so leads are shared, not per-user.
- **SQLite file DB** — fine for a take-home; on a hosted deploy the file
  lives on the server's disk (see "improve" below).
- **Seed data** — 3 sample leads are inserted on a fresh DB for demo
  purposes; documented in `server/db.js`.

## What I would improve with more time

1. **Authentication (JWT)** — signup/login so each user sees only their own
   leads (the first bonus item). Schema already has room for a `user_id`.
2. **Server-side pagination** — the list endpoint already supports
   search/filter/sort; adding `limit`/`offset` is a small step.
3. **Automated API tests** — e.g. `node:test` + `supertest` covering the
   validation and CRUD paths (currently verified manually with curl).
4. **Hosted database** — move from a SQLite file to MongoDB Atlas (or
   Postgres) so data survives redeploys on a free host.
5. **Edit history** — an `updated_at` column already exists; a small audit
   trail of status changes would be useful for a sales team.

## Submission

- Repo: https://github.com/Sumit1003/lead-manager
- Live demo: _(added after deployment)_
- Built by Sumit Kumar — React, Node.js, Express, MongoDB/SQLite, REST APIs.
