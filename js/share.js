// Links that leave this browser: the job tracker and the invoice, as a QR or a WhatsApp message.
// A phone that scans opens a fresh page holding only the seed data, so a job or invoice made
// live during the demo travels inside its own link as a compact snapshot (base64url JSON in the
// ?d= query). The receiving page prefers its own live copy when it has the same job for the same
// car, and otherwise shows the snapshot "as of" the moment it was shared.

import { STATE, staffById, etaFor, bayById } from './state.js';
import { fmtRMTight, plateKey } from './ui.js';

// ---------- base64url JSON ----------
export function encode(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let text = '';
  bytes.forEach((b) => { text += String.fromCharCode(b); });
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode(text) {
  try {
    const base = String(text).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base + '==='.slice((base.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

// The full address of a page in this app ("https://…/#/job/JOB-0418?d=…").
export function absUrl(hash) {
  return `${location.origin}${location.pathname}#${hash}`;
}

// ---------- job snapshot ----------
export function jobSnapshot(job) {
  return {
    v: 1, i: job.id, s: job.status, p: job.plate, m: job.model, n: job.name,
    b: job.bay ? bayById(job.bay)?.name : null, k: staffById(job.mechanicId)?.name || null,
    q: job.queueNo, c: job.checkedInAt, e: etaFor(job), x: job.invoiceNo,
    l: job.lines.map((l) => [l.name, l.qty]), t: new Date().toISOString(),
  };
}

export function expandJob(snap) {
  if (!snap || snap.v !== 1 || !snap.i) return null;
  return {
    id: snap.i, status: snap.s, plate: snap.p, model: snap.m, name: snap.n,
    bayName: snap.b, mechanicName: snap.k, queueNo: snap.q, checkedInAt: snap.c, eta: snap.e,
    invoiceNo: snap.x, lines: (snap.l || []).map(([name, qty]) => ({ name, qty })), asOf: snap.t,
  };
}

export function jobLink(job) {
  return absUrl(`/job/${job.id}?d=${encode(jobSnapshot(job))}`);
}

// ---------- invoice snapshot ----------
export function invoiceSnapshot(inv) {
  return {
    v: 1, no: inv.no, j: inv.jobId, n: inv.name, p: inv.plate, m: inv.model, ia: inv.issuedAt, pa: inv.paidAt,
    l: inv.lines.map((l) => [l.name, l.qty, l.price, l.discount || 0]),
    d: inv.discount, st: inv.subtotal, r: inv.sstRate, x: inv.sst, t: inv.total,
    y: inv.payments.map((p) => [p.method, p.amount, p.at]),
  };
}

export function expandInvoice(snap) {
  if (!snap || snap.v !== 1 || !snap.no) return null;
  return {
    no: snap.no, jobId: snap.j, name: snap.n, plate: snap.p, model: snap.m, issuedAt: snap.ia, paidAt: snap.pa,
    lines: (snap.l || []).map(([name, qty, price, discount]) => ({ name, qty, price, discount })),
    discount: snap.d, subtotal: snap.st, sstRate: snap.r, sst: snap.x, total: snap.t,
    payments: (snap.y || []).map(([method, amount, at]) => ({ method, amount, at })),
    fromSnapshot: true,
  };
}

export function invoiceLink(inv) {
  return absUrl(`/invoice/${inv.no}?d=${encode(invoiceSnapshot(inv))}`);
}

// Pick the live copy when this browser has the same record for the same car, else the snapshot.
export function preferLive(live, snap) {
  if (live && (!snap || plateKey(live.plate) === plateKey(snap.plate))) return live;
  return snap;
}

// ---------- WhatsApp ----------
// "012-000 1001" -> "60120001001" (Malaysian numbers), anything else -> digits only.
export function waNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return `6${digits}`;
  return digits;
}

// One tap: opens WhatsApp with the message typed. No number = the user picks the chat.
export function waLink(phone, text) {
  const number = waNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

export function invoiceWaText(inv) {
  return fill(STATE.settings.waTemplate, {
    name: inv.name, invoice: inv.no, plate: inv.plate, total: fmtRMTight(inv.total),
    link: invoiceLink(inv), shop: STATE.shop.name,
  });
}

// Who the invoice goes to, from Settings: the customer, a fixed demo number, or let me choose.
export function invoiceWaTarget(inv) {
  const { waTarget, demoPhone } = STATE.settings;
  if (waTarget === 'customer') return inv.phone;
  if (waTarget === 'demo') return demoPhone;
  return '';
}

export function invoiceWaLink(inv) {
  return waLink(invoiceWaTarget(inv), invoiceWaText(inv));
}
