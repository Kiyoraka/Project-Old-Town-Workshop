// Demo sign-in for the admin: ANY email-shaped address and ANY non-empty password work, so a
// workshop owner gets in with zero friction. The signed-in email lives in sessionStorage (it
// survives a refresh). Storage may be blocked, so a tab-local copy backs it up.

const KEY = 'otw_admin';
let fallback = null;

export function validateLogin(email, password) {
  const errors = {};
  const value = String(email || '').trim();
  if (!value) errors.email = 'Enter any email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'That does not look like an email address.';
  if (!String(password || '')) errors.password = 'Enter any password.';
  return errors;
}

export function login(email, password) {
  const errors = validateLogin(email, password);
  if (Object.keys(errors).length) return { ok: false, errors };
  const value = String(email).trim().toLowerCase();
  fallback = value;
  try { sessionStorage.setItem(KEY, value); } catch { /* blocked storage: keep the tab copy */ }
  return { ok: true };
}

export function logout() {
  fallback = null;
  try { sessionStorage.removeItem(KEY); } catch { /* nothing stored */ }
}

export function signedInEmail() {
  try { return sessionStorage.getItem(KEY) || fallback; } catch { return fallback; }
}

export function isSignedIn() {
  return Boolean(signedInEmail());
}
