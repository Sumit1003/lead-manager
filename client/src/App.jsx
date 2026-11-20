import { useEffect, useState } from 'react';
import {
  getMeta,
  getStats,
  listLeads,
  createLead,
  updateLead,
  deleteLead,
} from './api.js';
import './App.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the backend (server/validate.js). The backend re-checks
// everything, so this is only for instant feedback in the form.
function validateForm(values) {
  const errors = {};
  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Name is required (at least 2 characters).';
  }
  if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'A valid email address is required.';
  }
  const digits = values.phone.replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(digits)) {
    errors.phone = 'A valid phone number is required (7–15 digits, optional +).';
  }
  return errors;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Website',
  status: 'New',
};

function LeadForm({ initial, sources, statuses, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validateForm(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      // Server-side validation errors come back per field — show them inline.
      if (err.errors) setErrors(err.errors);
      else setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Name *
          <input value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Aarav Sharma" />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>
          Email *
          <input value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="aarav@company.com" />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>
        <label>
          Phone *
          <input value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>
        <label>
          Company
          <input value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" />
        </label>
        <label>
          Source *
          <select value={values.source} onChange={(e) => set('source', e.target.value)}>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Status *
          <select value={values.status} onChange={(e) => set('status', e.target.value)}>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [meta, setMeta] = useState({ sources: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(null); // lead object being edited, or null
  const [deleteTarget, setDeleteTarget] = useState(null); // lead awaiting delete confirm

  async function refresh(params) {
    try {
      const [rows, s] = await Promise.all([listLeads(params), getStats()]);
      setLeads(rows);
      setStats(s);
      setApiError('');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load dropdown options once on mount.
  useEffect(() => {
    getMeta().then(setMeta).catch((err) => setApiError(err.message));
  }, []);

  // Reload the list whenever the search / filter / sort changes.
  // Search is debounced by 300 ms so we don't fire a request per keystroke.
  useEffect(() => {
    const [sortCol, order] =
      sort === 'name' ? ['name', 'asc'] : sort === 'status' ? ['status', 'asc'] : ['created_at', 'desc'];
    const t = setTimeout(
      () => refresh({ search, status: statusFilter, sort: sortCol, order }),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sort]);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  }

  async function handleCreate(values) {
    const lead = await createLead(values);
    flash(`Lead "${lead.name}" added.`);
    refresh({ search, status: statusFilter, sort: 'created_at', order: 'desc' });
  }

  async function handleUpdate(values) {
    const lead = await updateLead(editing.id, values);
    setEditing(null);
    flash(`Lead "${lead.name}" updated.`);
    refresh({ search, status: statusFilter, sort: 'created_at', order: 'desc' });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteLead(deleteTarget.id);
    flash(`Lead "${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    refresh({ search, status: statusFilter, sort: 'created_at', order: 'desc' });
  }

  const statusList = meta.statuses.length ? meta.statuses : ['New', 'Contacted', 'Qualified', 'Lost'];
  const sourceList = meta.sources.length ? meta.sources : ['Website', 'Referral', 'Social Media', 'Cold Call', 'Event', 'Other'];

  return (
    <div className="app">
      <header className="header">
        <h1>Lead Manager</h1>
        <p>Capture, track and manage your sales leads in one place.</p>
      </header>

      {apiError && (
        <div className="banner error" role="alert">
          {apiError} Make sure the backend is running (<code>npm start</code> in <code>server</code>).
        </div>
      )}
      {notice && <div className="banner success" role="status">{notice}</div>}

      <section className="stats" aria-label="Lead counts">
        <div className="stat-card total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total leads</span>
        </div>
        {statusList.map((s) => (
          <div key={s} className="stat-card">
            <span className="stat-number">{stats.byStatus?.[s] ?? 0}</span>
            <span className="stat-label">{s}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{editing ? `Edit lead — ${editing.name}` : 'Add a new lead'}</h2>
        <LeadForm
          key={editing ? editing.id : 'new'}
          initial={editing ?? EMPTY_FORM}
          sources={sourceList}
          statuses={statusList}
          submitLabel={editing ? 'Save changes' : 'Add lead'}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={editing ? () => setEditing(null) : null}
        />
      </section>

      <section className="card">
        <div className="toolbar">
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or company…"
            aria-label="Search leads"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statusList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort leads">
            <option value="newest">Newest first</option>
            <option value="name">Name (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </div>

        {loading ? (
          <p className="muted">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="muted">No leads found. Add your first lead above, or clear the search/filter.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.email}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.company || '—'}</td>
                    <td>{lead.source}</td>
                    <td>
                      <span className={`badge ${lead.status.toLowerCase()}`}>{lead.status}</span>
                    </td>
                    <td>{lead.created_at?.slice(0, 10)}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => { setEditing(lead); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        Edit
                      </button>
                      <button className="btn small danger" onClick={() => setDeleteTarget(lead)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="confirm-overlay" role="dialog" aria-label="Confirm delete">
          <div className="confirm-box">
            <h3>Delete this lead?</h3>
            <p>
              “{deleteTarget.name}” ({deleteTarget.email}) will be permanently removed.
              This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn danger" onClick={handleDelete}>Yes, delete</button>
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        Lead Manager — React + Express + SQLite · Built for the Meru Technosoft screening assignment
      </footer>
    </div>
  );
}
