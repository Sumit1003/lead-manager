// Shared validation rules (used by the API). The frontend mirrors these rules
// so the user gets instant feedback, but the backend is the source of truth.
export const SOURCES = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Event', 'Other'];
export const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPhone(phone) {
  // Allow an optional leading + and spaces/dashes, then 7–15 digits.
  const digits = String(phone ?? '').replace(/[\s-]/g, '');
  return /^\+?\d{7,15}$/.test(digits);
}

// Returns an object of field -> error message. Empty object means valid.
export function validateLead(data = {}) {
  const errors = {};

  if (!data.name || String(data.name).trim().length < 2) {
    errors.name = 'Name is required (at least 2 characters).';
  }
  if (!data.email || !EMAIL_RE.test(String(data.email).trim())) {
    errors.email = 'A valid email address is required.';
  }
  if (!data.phone || !isValidPhone(data.phone)) {
    errors.phone = 'A valid phone number is required (7–15 digits, optional +).';
  }
  if (!SOURCES.includes(data.source)) {
    errors.source = `Source must be one of: ${SOURCES.join(', ')}.`;
  }
  if (!STATUSES.includes(data.status)) {
    errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;
  }
  // Company is optional — an empty string is fine.
  return errors;
}
