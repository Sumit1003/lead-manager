// Tiny fetch wrapper for the Lead Manager API.
// Base URL is empty by default: in dev the Vite proxy forwards /api to the
// Express server, in production the server hosts the built app on same origin.
// Set VITE_API_URL only if the frontend is hosted separately.
const BASE = import.meta.env.VITE_API_URL || '';

async function req(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.errors = data.errors || null; // field-level validation errors from API
    err.status = res.status;
    throw err;
  }
  return data;
}

export const getMeta = () => req('/api/meta');
export const getStats = () => req('/api/leads/stats');
export const listLeads = ({ search = '', status = '', sort = 'created_at', order = 'desc' } = {}) => {
  const q = new URLSearchParams({ search, status, sort, order });
  return req(`/api/leads?${q}`);
};
export const createLead = (lead) => req('/api/leads', { method: 'POST', body: JSON.stringify(lead) });
export const updateLead = (id, lead) =>
  req(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(lead) });
export const deleteLead = (id) => req(`/api/leads/${id}`, { method: 'DELETE' });
