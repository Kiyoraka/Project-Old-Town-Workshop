// Small view helpers: an escaping html`` template, a toast, money and date formatting.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

class SafeHtml {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}

// Mark a string as already-safe markup (only for strings built by html`` or trusted SVG).
export function raw(text) {
  return new SafeHtml(text);
}

function renderValue(value) {
  if (value instanceof SafeHtml) return value.text;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === false || value === null || value === undefined) return '';
  return escape(value);
}

// Interpolated values are escaped; nested html`` results and arrays of them pass through.
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += renderValue(value) + strings[i + 1]; });
  return new SafeHtml(out);
}

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth; // restart the entry animation
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// Speak a short line to screen readers through the one live region that never repaints.
export function announce(message) {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

// 80 -> "RM 80.00"; 2431.5 -> "RM 2,431.50"
export function fmtRM(amount) {
  return 'RM ' + Number(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Invoice style, no space: "RM392.00" (as on the sample invoice).
export function fmtRMTight(amount) {
  return fmtRM(amount).replace(' ', '');
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

const pad = (n) => String(n).padStart(2, '0');

// A local calendar day as "YYYY-MM-DD".
export function dayStr(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day, count) {
  const [y, m, d] = day.split('-').map(Number);
  return dayStr(new Date(y, m - 1, d + count));
}

export function isToday(iso) {
  return Boolean(iso) && dayStr(iso) === dayStr();
}

// "2026-09-27 15:55:37", the invoice stamp.
export function fmtStamp(iso) {
  const d = new Date(iso);
  return `${dayStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// "10:42 AM"
export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// "09:00" slot label -> "9:00 AM"
export function fmtSlot(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

// "2026-10-30" -> "Thu 30 Oct"
export function fmtDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function pluralize(count, word, plural = `${word}s`) {
  return `${count} ${count === 1 ? word : plural}`;
}

// "wxy1234" / "WXY 1234" -> "WXY1234", for matching plates however they were typed.
export function plateKey(plate) {
  return String(plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Tidy a typed plate for display: letters and digits split by one space ("WXY 1234").
export function tidyPlate(plate) {
  const key = plateKey(plate);
  return key.replace(/^([A-Z]+)(\d+)([A-Z]*)$/, (_, a, b, c) => [a, b + (c ? ' ' + c : '')].join(' ')) || key;
}
