// One shared STATE for every page: bookings, jobs and their lines, invoices, parts and their
// movements, staff, the shop profile and settings. Pages read it through the lookups and
// selectors below and change it only through the actions. Every action saves to localStorage,
// re-renders (subscribe) and tells other tabs (onChange -> channel.js).

import { seed, SLOTS, JOB_STATUSES } from './data.js';
import { load, save, clear } from './store.js';
import { dayStr, isToday, round2, plateKey, tidyPlate } from './ui.js';

export const STATE = load() || seed();
save(STATE);

// ---------- notify ----------
const listeners = new Set();
const changeListeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onChange(fn) {
  changeListeners.add(fn);
}

function commit() {
  save(STATE);
  listeners.forEach((fn) => fn());
  changeListeners.forEach((fn) => fn());
}

function replaceWith(next) {
  Object.keys(STATE).forEach((key) => { delete STATE[key]; });
  Object.assign(STATE, next);
}

// Another tab changed the data: take its state as ours, without telling the tabs again.
export function adoptState(next) {
  replaceWith(next);
  save(STATE);
  listeners.forEach((fn) => fn());
}

export function resetDemo() {
  clear();
  replaceWith(seed());
  commit();
}

const pad = (n, width) => String(n).padStart(width, '0');
const nowIso = () => new Date().toISOString();

// ---------- lookups ----------
export const serviceById = (id) => STATE.services.find((s) => s.id === id);
export const partById = (id) => STATE.parts.find((p) => p.id === id);
export const staffById = (id) => STATE.staff.find((s) => s.id === id);
export const jobById = (id) => STATE.jobs.find((j) => j.id === id);
export const bookingById = (id) => STATE.bookings.find((b) => b.id === String(id).toUpperCase());
export const invoiceByNo = (no) => STATE.invoices.find((i) => i.no === no);
export const bayById = (id) => STATE.bays.find((b) => b.id === Number(id));
export const statusLabel = (id) => JOB_STATUSES.find((s) => s.id === id)?.label || id;

export function mechanics({ activeOnly = true } = {}) {
  return STATE.staff.filter((s) => s.role === 'mechanic' && (!activeOnly || s.active));
}

export function vehicleByPlate(plate) {
  const key = plateKey(plate);
  if (!key) return null;
  const known = STATE.vehicles.find((v) => plateKey(v.plate) === key);
  if (known) return known;
  const fromJob = [...STATE.jobs].reverse().find((j) => plateKey(j.plate) === key);
  return fromJob ? { plate: fromJob.plate, model: fromJob.model, name: fromJob.name, phone: fromJob.phone } : null;
}

// ---------- money ----------
export const lineNet = (line) => round2(line.qty * line.price - (line.discount || 0));

// Totals for a set of lines, with an optional bill discount (RM or %) and SST.
export function totals(lines, { discountType = 'rm', discountValue = 0, sstEnabled = false, sstRate = 0 } = {}) {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineNet(line), 0));
  const raw = discountType === 'pct' ? subtotal * (Number(discountValue) || 0) / 100 : Number(discountValue) || 0;
  const discount = round2(Math.min(Math.max(raw, 0), subtotal));
  const taxable = round2(subtotal - discount);
  const rate = sstEnabled ? Number(sstRate) || 0 : 0;
  const sst = round2(taxable * rate / 100);
  return { subtotal, discount, taxable, sstRate: rate, sst, total: round2(taxable + sst) };
}

export const jobTotal = (job) => totals(job.lines).total;

export function nextInvoiceNo() {
  return `${STATE.settings.invoicePrefix}${pad(STATE.counters.invoice, 7)}`;
}

// ---------- selectors ----------
export function openJobs() {
  return STATE.jobs.filter((j) => j.status !== 'paid');
}

export function jobsByStatus(status) {
  return STATE.jobs.filter((j) => j.status === status && (status !== 'paid' || isToday(j.statusAt.paid)));
}

export function todayInvoices() {
  return STATE.invoices.filter((i) => isToday(i.paidAt));
}

export function todayStats() {
  const paid = todayInvoices();
  const revenue = round2(paid.reduce((sum, i) => sum + i.total, 0));
  return {
    revenue,
    paidCount: paid.length,
    avgTicket: paid.length ? round2(revenue / paid.length) : 0,
    open: openJobs().length,
    bookings: STATE.bookings.filter((b) => b.date === dayStr() && b.status !== 'cancelled').length,
  };
}

// Revenue per day for the last n days, oldest first.
export function revenueByDay(days = 7) {
  const out = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = dayStr(Date.now() - back * 86400000);
    const total = STATE.invoices.filter((i) => dayStr(i.paidAt) === day).reduce((sum, i) => sum + i.total, 0);
    out.push({ day, total: round2(total) });
  }
  return out;
}

// Who is in each bay right now (a job that is not yet ready).
export function bayBoard() {
  return STATE.bays.map((bay) => ({
    bay,
    job: openJobs().find((j) => j.bay === bay.id && j.status !== 'ready') || null,
  }));
}

export function lowStock() {
  return STATE.parts.filter((p) => p.qty <= p.min);
}

export function partMoves(partId) {
  return STATE.stockMoves.filter((m) => m.partId === partId).sort((a, b) => b.at.localeCompare(a.at));
}

export function jobsTodayFor(staffId) {
  return STATE.jobs.filter((j) => j.mechanicId === staffId && isToday(j.checkedInAt)).length;
}

export function bookingsOn(day) {
  return STATE.bookings.filter((b) => b.date === day).sort((a, b) => a.time.localeCompare(b.time) || a.bay - b.bay);
}

function bayTaken(day, time, bay) {
  return STATE.bookings.some((b) => b.date === day && b.time === time && b.bay === bay && b.status !== 'cancelled');
}

// Free bays for a slot (a slot already past today counts as full).
export function freeBays(day, time) {
  if (day === dayStr()) {
    const [h, m] = time.split(':').map(Number);
    const slot = new Date();
    slot.setHours(h, m, 0, 0);
    if (slot.getTime() < Date.now()) return [];
  }
  return STATE.bays.filter((bay) => !bayTaken(day, time, bay.id));
}

export function slotsFor(day) {
  return SLOTS.map((time) => ({ time, free: freeBays(day, time) }));
}

// A booking a customer can check in with: by its code, or by plate for today.
export function findBookingForCheckIn(query) {
  const text = String(query || '').trim();
  if (!text) return null;
  const byCode = bookingById(text);
  if (byCode) return byCode;
  const key = plateKey(text);
  const mine = STATE.bookings.filter((b) => plateKey(b.plate) === key && b.status !== 'cancelled');
  return mine.find((b) => b.date === dayStr() && b.status !== 'checked-in')
    || mine.find((b) => b.date >= dayStr() && b.status !== 'checked-in')
    || null;
}

// A rough ready-by time: check-in plus the minutes of every service on the job.
export function etaFor(job) {
  if (!job.checkedInAt) return null;
  const minutes = job.lines.filter((l) => l.kind === 'service')
    .reduce((sum, l) => sum + (serviceById(l.refId)?.minutes || 30) * l.qty, 0) || 45;
  return new Date(new Date(job.checkedInAt).getTime() + (minutes + 20) * 60000).toISOString();
}

// ---------- bookings ----------
export function createBooking({ date, time, bay, serviceId, plate, model, name, phone, notes = '', status = 'pending' }) {
  const free = freeBays(date, time);
  const chosen = free.find((b) => b.id === Number(bay)) || free[0];
  if (!chosen) return { ok: false, reason: 'That slot was just taken. Please pick another time.' };
  const booking = {
    id: `BK-${pad(STATE.counters.booking++, 4)}`,
    date, time, bay: chosen.id, serviceId,
    plate: tidyPlate(plate), model: model.trim(), name: name.trim(), phone: phone.trim(), notes: notes.trim(),
    status, jobId: null, createdAt: nowIso(),
  };
  STATE.bookings.push(booking);
  rememberVehicle(booking);
  commit();
  return { ok: true, booking };
}

export function setBookingStatus(id, status) {
  const booking = bookingById(id);
  if (!booking || booking.status === 'checked-in') return;
  booking.status = status;
  commit();
}

function rememberVehicle({ plate, model, name, phone }) {
  const known = STATE.vehicles.find((v) => plateKey(v.plate) === plateKey(plate));
  if (known) Object.assign(known, { model, name, phone });
  else STATE.vehicles.push({ plate: tidyPlate(plate), model, name, phone });
}

// ---------- jobs ----------
function newLine(fields) {
  return { id: `L${STATE.counters.line++}`, discount: 0, ...fields };
}

function serviceLine(serviceId, qty = 1) {
  const s = serviceById(serviceId);
  return s ? newLine({ kind: 'service', refId: s.id, name: s.name, qty, price: s.price }) : null;
}

// Check a car in, from a booking or as a walk-in. Returns the new job.
export function checkIn({ bookingId, plate, model, name, phone, serviceId, notes = '' }) {
  const booking = bookingId ? bookingById(bookingId) : null;
  if (booking?.jobId && jobById(booking.jobId)) return { ok: true, job: jobById(booking.jobId), existing: true };
  const source = booking || { plate, model, name, phone, serviceId, notes };
  const todayCount = STATE.jobs.filter((j) => isToday(j.checkedInAt)).length;
  const at = nowIso();
  const job = {
    id: `JOB-${pad(STATE.counters.job++, 4)}`,
    status: 'checked-in',
    plate: tidyPlate(source.plate), model: source.model.trim(), name: source.name.trim(), phone: source.phone.trim(),
    bay: booking ? booking.bay : null,
    mechanicId: null,
    queueNo: todayCount + 1,
    bookingId: booking ? booking.id : null,
    notes: (source.notes || '').trim(),
    checkedInAt: at,
    statusAt: { 'checked-in': at },
    lines: [],
    invoiceNo: null,
  };
  const line = source.serviceId ? serviceLine(source.serviceId) : null;
  if (line) job.lines.push(line);
  STATE.jobs.push(job);
  if (booking) { booking.status = 'checked-in'; booking.jobId = job.id; }
  rememberVehicle(job);
  commit();
  return { ok: true, job };
}

export function setJobStatus(jobId, status) {
  const job = jobById(jobId);
  if (!job || job.status === 'paid' || status === 'paid') return;
  job.status = status;
  job.statusAt[status] = nowIso();
  if (status === 'ready') job.bay = null;     // the car leaves the bay for the pickup line
  commit();
}

export function assignMechanic(jobId, staffId) {
  const job = jobById(jobId);
  if (!job) return;
  job.mechanicId = staffId || null;
  commit();
}

export function setJobBay(jobId, bayId) {
  const job = jobById(jobId);
  if (!job) return;
  job.bay = bayId ? Number(bayId) : null;
  commit();
}

export function setJobNotes(jobId, notes) {
  const job = jobById(jobId);
  if (!job) return;
  job.notes = notes;
  commit();
}

export function addServiceLine(jobId, serviceId) {
  const job = jobById(jobId);
  const line = serviceLine(serviceId);
  if (!job || !line || job.status === 'paid') return;
  const same = job.lines.find((l) => l.kind === 'service' && l.refId === serviceId);
  if (same) same.qty += 1;
  else job.lines.push(line);
  commit();
}

function moveStock(partId, qty, kind, ref) {
  const part = partById(partId);
  part.qty += qty;
  STATE.stockMoves.push({ id: `M${STATE.counters.move++}`, partId, at: nowIso(), qty, kind, ref });
}

// Use a part on a job: it leaves stock at once and the movement names the job.
export function addPartLine(jobId, partId, qty = 1) {
  const job = jobById(jobId);
  const part = partById(partId);
  if (!job || !part || job.status === 'paid') return { ok: false };
  if (part.qty < qty) return { ok: false, reason: `Only ${part.qty} ${part.name} left in stock.` };
  const same = job.lines.find((l) => l.kind === 'part' && l.refId === partId);
  if (same) same.qty += qty;
  else job.lines.push(newLine({ kind: 'part', refId: part.id, name: `${part.name} (${part.brand})`, qty, price: part.price }));
  moveStock(partId, -qty, 'used', job.id);
  commit();
  return { ok: true };
}

export function changeLineQty(jobId, lineId, delta) {
  const job = jobById(jobId);
  const line = job?.lines.find((l) => l.id === lineId);
  if (!line || job.status === 'paid') return { ok: false };
  if (line.qty + delta < 1) return removeLine(jobId, lineId);
  if (line.kind === 'part') {
    const part = partById(line.refId);
    if (delta > 0 && part.qty < delta) return { ok: false, reason: `No more ${part.name} in stock.` };
    moveStock(line.refId, -delta, delta > 0 ? 'used' : 'returned', job.id);
  }
  line.qty += delta;
  commit();
  return { ok: true };
}

export function removeLine(jobId, lineId) {
  const job = jobById(jobId);
  const line = job?.lines.find((l) => l.id === lineId);
  if (!line || job.status === 'paid') return { ok: false };
  if (line.kind === 'part') moveStock(line.refId, line.qty, 'returned', job.id);
  job.lines = job.lines.filter((l) => l.id !== lineId);
  commit();
  return { ok: true };
}

// ---------- checkout ----------
// Take payment for a ready job: the invoice is issued and paid in one step, like the counter.
export function pay(jobId, { discountType = 'rm', discountValue = 0, sstEnabled = false, method, cashGiven = null }) {
  const job = jobById(jobId);
  if (!job || job.status === 'paid' || !job.lines.length) return { ok: false };
  const sums = totals(job.lines, { discountType, discountValue, sstEnabled, sstRate: STATE.settings.sstRate });
  const at = nowIso();
  const invoice = {
    no: nextInvoiceNo(),
    jobId: job.id,
    name: job.name, phone: job.phone, plate: job.plate, model: job.model,
    issuedAt: at, paidAt: at,
    lines: job.lines.map(({ name, qty, price, discount }) => ({ name, qty, price, discount: discount || 0 })),
    discount: sums.discount, subtotal: sums.subtotal, sstRate: sums.sstRate, sst: sums.sst, total: sums.total,
    payments: [{ method, amount: sums.total, at, ...(cashGiven ? { cashGiven: round2(cashGiven) } : {}) }],
  };
  STATE.counters.invoice += 1;
  STATE.invoices.push(invoice);
  job.status = 'paid';
  job.statusAt.paid = at;
  job.invoiceNo = invoice.no;
  job.bay = null;
  commit();
  return { ok: true, invoice };
}

// ---------- inventory ----------
export function savePart(fields) {
  const clean = {
    sku: fields.sku.trim().toUpperCase(), name: fields.name.trim(), brand: fields.brand.trim(), fits: fields.fits.trim(),
    min: Math.max(0, Math.round(Number(fields.min) || 0)),
    cost: round2(Number(fields.cost) || 0), price: round2(Number(fields.price) || 0),
  };
  if (fields.id) {
    Object.assign(partById(fields.id), clean);
  } else {
    const part = { id: `p${STATE.counters.part++}`, ...clean, qty: 0 };
    STATE.parts.push(part);
    const opening = Math.max(0, Math.round(Number(fields.qty) || 0));
    if (opening) moveStock(part.id, opening, 'in', 'Opening stock');
  }
  commit();
}

export function stockIn(partId, qty, note = 'Stock in') {
  const amount = Math.round(Number(qty) || 0);
  if (!partById(partId) || amount === 0) return;
  moveStock(partId, amount, amount > 0 ? 'in' : 'adjust', note.trim() || 'Stock in');
  commit();
}

// ---------- staff ----------
export function saveStaff(fields) {
  const clean = { name: fields.name.trim(), role: fields.role, phone: fields.phone.trim() };
  if (fields.id) Object.assign(staffById(fields.id), clean);
  else STATE.staff.push({ id: `s${STATE.counters.staff++}`, ...clean, active: true, since: String(new Date().getFullYear()) });
  commit();
}

export function toggleStaffActive(id) {
  const person = staffById(id);
  if (!person) return;
  person.active = !person.active;
  commit();
}

// ---------- shop + settings ----------
export function saveShop(fields) {
  Object.assign(STATE.shop, fields);
  commit();
}

export function saveSettings(fields) {
  Object.assign(STATE.settings, fields);
  commit();
}
