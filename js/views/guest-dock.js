// The customer's bottom tab bar on a phone: Home · Book · Check in · My job · Staff. It shows
// only under 768 px (desktop keeps the buttons in the page). My job points at the last job this
// phone checked in or opened from a QR: greyed out (opening Track) before the first one, a brass
// dot while the car is in the workshop, a green tick once it is ready or paid. The list of my
// jobs lives in this device's own storage, apart from the shared demo data.

import { html } from '../ui.js';
import { jobById, statusLabel } from '../state.js';
import { isSignedIn } from '../auth.js';
import { icon } from './icons.js';

const KEY = 'otw_my_jobs';

function readMine() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

// Remember a job on this phone, with the exact link it came from (a QR link carries its snapshot).
export function rememberJob(id, href = `#/job/${id}`) {
  const list = readMine().filter((j) => j.id !== id);
  list.push({ id, href });
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-5))); } catch { /* storage blocked: no memory */ }
}

function latestJob() {
  const mine = readMine().at(-1);
  if (!mine) return null;
  const live = jobById(mine.id);
  return { ...mine, status: live ? live.status : null };
}

function item({ id, href, label, iconName, active, extra = '', title = '', disabled = false }) {
  const inner = html`
    <span class="dock-icon">${icon(iconName, { size: 22 })}${extra}</span>
    <span class="dock-label">${label}</span>`;
  return html`
    <a class="dock-item ${active === id ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}" href="${href}" title="${title}"
       aria-current="${active === id ? 'page' : 'false'}">${inner}</a>`;
}

export function guestDock(active = '') {
  const job = latestJob();
  const done = job && ['ready', 'paid'].includes(job.status);
  const jobExtra = !job || !job.status ? ''
    : done ? html`<span class="dock-check" aria-hidden="true">${icon('check', { size: 10 })}</span>`
    : html`<span class="dock-dot" aria-hidden="true"></span>`;
  return html`
    <nav class="dock dock-guest" aria-label="Main">
      ${item({ id: 'home', href: '#/', label: 'Home', iconName: 'wrench', active })}
      ${item({ id: 'book', href: '#/book', label: 'Book', iconName: 'calendar', active })}
      ${item({ id: 'checkin', href: '#/checkin', label: 'Check in', iconName: 'qr', active })}
      ${item({
        id: 'job', href: job ? job.href : '#/track', label: 'My job', iconName: 'car', active, extra: jobExtra,
        title: job ? `${job.id}${job.status ? ` · ${statusLabel(job.status)}` : ''}` : 'No job yet: find one by plate',
        disabled: !job,
      })}
      ${item({ id: 'staff', href: isSignedIn() ? '#/admin' : '#/login', label: 'Staff', iconName: 'user', active })}
    </nav>`;
}
