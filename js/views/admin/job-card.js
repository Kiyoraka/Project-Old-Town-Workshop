// #/admin/job/:id — one job: the car and customer, its stage, mechanic and bay, the labour and
// the parts on it, the complaint, and the running total. A part added here leaves stock at once
// and the movement names this job; taking it off puts it back. Charge opens at Ready. A paid job
// is read-only and links to its invoice.

import { html, fmtRM, fmtTime, toast } from '../../ui.js';
import {
  STATE, jobById, mechanics, bookingById, lineNet, totals, setJobStatus, assignMechanic, setJobBay,
  setJobNotes, addServiceLine, addPartLine, changeLineQty, removeLine, statusLabel,
} from '../../state.js';
import { JOB_STATUSES } from '../../data.js';
import { refresh } from '../../router.js';
import { plate, statusPill } from '../public.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let partQuery = '';

function lineRow(job, line, editable) {
  return html`
    <li class="line">
      <span class="line-name">${line.name}<span class="cell-sub">${fmtRM(line.price)} each${line.discount ? ` · less ${fmtRM(line.discount)}` : ''}</span></span>
      ${editable ? html`
        <span class="qty">
          <button class="icon-btn" data-action="qty" data-line="${line.id}" data-delta="-1" aria-label="One less">${icon('minus', { size: 16 })}</button>
          <b class="tabular">${line.qty}</b>
          <button class="icon-btn" data-action="qty" data-line="${line.id}" data-delta="1" aria-label="One more">${icon('plus', { size: 16 })}</button>
        </span>` : html`<span class="qty"><b class="tabular">${line.qty}×</b></span>`}
      <b class="line-total tabular">${fmtRM(lineNet(line))}</b>
      ${editable ? html`<button class="icon-btn btn-danger" data-action="remove-line" data-line="${line.id}" aria-label="Remove ${line.name}">${icon('trash', { size: 16 })}</button>` : ''}
    </li>`;
}

function partPicker() {
  return html`
    <div class="part-picker">
      <label class="toolbar-search" style="max-width:none">${icon('search', { size: 16 })}
        <input class="input" type="search" placeholder="Search parts: absorber, Myvi, KYB…" value="${partQuery}" data-input="part-search" aria-label="Search parts"></label>
      <ul class="part-list">
        ${STATE.parts.map((p) => {
          const text = `${p.sku} ${p.name} ${p.brand} ${p.fits}`.toLowerCase();
          const low = p.qty <= p.min;
          return html`
            <li data-search="${text}" ${partQuery && !text.includes(partQuery) ? 'hidden' : ''}>
              <span class="line-name">${p.name} <span class="muted">(${p.brand})</span><span class="cell-sub">${p.fits} · <span class="sku">${p.sku}</span></span></span>
              <span class="status ${low ? 'status-low' : 'status-ready'}">${p.qty} in stock</span>
              <b class="tabular">${fmtRM(p.price)}</b>
              <button class="btn btn-outline btn-sm" data-action="add-part" data-id="${p.id}" ${p.qty < 1 ? 'disabled' : ''}>${icon('plus', { size: 14 })} Add</button>
            </li>`;
        })}
      </ul>
    </div>`;
}

export const jobCardPage = adminPage({
  active: 'jobs',
  title: ({ id }) => `Job ${id}`,
  render({ id }) {
    const job = jobById(id);
    if (!job) return html`<section class="card empty"><p>Job ${id} was not found.</p><a class="btn btn-primary" href="#/admin/jobs">Job board</a></section>`;
    const editable = job.status !== 'paid';
    const services = job.lines.filter((l) => l.kind === 'service');
    const parts = job.lines.filter((l) => l.kind === 'part');
    const sum = totals(job.lines);
    const booking = job.bookingId ? bookingById(job.bookingId) : null;
    const used = new Set(services.map((l) => l.refId));
    return html`
      <a class="back-link" href="#/admin/jobs">${icon('back', { size: 16 })} Job board</a>
      <section class="card job-head">
        <div class="job-head-car">
          <span class="slip-no mono">${job.id}</span>
          ${plate(job.plate, { large: true })}
          <span><b>${job.model}</b><span class="cell-sub">${job.name} · ${job.phone}</span></span>
          <span class="spacer"></span>
          ${statusPill(job.status)}
        </div>
        <div class="job-head-meta muted small">
          Queue #${job.queueNo} · checked in ${fmtTime(job.checkedInAt)}
          ${booking ? html` · booking <b>${booking.id}</b>` : ' · walk-in'}
          · <a href="#/job/${job.id}" target="_blank" rel="noopener">customer view ${icon('arrow', { size: 12 })}</a>
          · <a href="#/slip/${job.id}" target="_blank" rel="noopener">slip + QR</a>
        </div>
        ${editable ? html`
          <div class="job-controls">
            <div class="field"><label for="jc-status">Stage</label>
              <select id="jc-status" class="select" data-input="status">
                ${JOB_STATUSES.filter((s) => s.id !== 'paid').map((s) => html`<option value="${s.id}" ${job.status === s.id ? 'selected' : ''}>${s.label}</option>`)}
              </select></div>
            <div class="field"><label for="jc-mech">Mechanic</label>
              <select id="jc-mech" class="select" data-input="mechanic">
                <option value="">Unassigned</option>
                ${mechanics().map((m) => html`<option value="${m.id}" ${job.mechanicId === m.id ? 'selected' : ''}>${m.name}</option>`)}
              </select></div>
            <div class="field"><label for="jc-bay">Bay</label>
              <select id="jc-bay" class="select" data-input="bay">
                <option value="">No bay</option>
                ${STATE.bays.map((b) => html`<option value="${b.id}" ${job.bay === b.id ? 'selected' : ''}>${b.name} · ${b.label}</option>`)}
              </select></div>
          </div>` : ''}
      </section>

      <div class="job-grid">
        <section class="card">
          <div class="card-head"><h2 class="sign-title">${icon('wrench', { size: 18 })} Labour</h2></div>
          ${services.length ? html`<ul class="lines">${services.map((l) => lineRow(job, l, editable))}</ul>` : html`<p class="empty">No labour yet.</p>`}
          ${editable ? html`
            <form class="add-row" data-submit="add-service">
              <select class="select" name="serviceId" aria-label="Add labour">
                ${STATE.services.map((s) => html`<option value="${s.id}">${used.has(s.id) ? '+1 · ' : ''}${s.name} · ${fmtRM(s.price)}</option>`)}
              </select>
              <button class="btn btn-patina btn-sm" type="submit">${icon('plus', { size: 14 })} Add</button>
            </form>` : ''}
        </section>
        <section class="card">
          <div class="card-head"><h2 class="sign-title">${icon('box', { size: 18 })} Parts used</h2><span class="spacer"></span><span class="muted small">taken from stock</span></div>
          ${parts.length ? html`<ul class="lines">${parts.map((l) => lineRow(job, l, editable))}</ul>` : html`<p class="empty">No parts yet.</p>`}
          ${editable ? partPicker() : ''}
        </section>
      </div>

      <section class="card job-foot">
        <div class="field job-notes">
          <label for="jc-notes">Complaint and notes</label>
          <textarea id="jc-notes" class="textarea" data-input="notes" ${editable ? '' : 'readonly'}>${job.notes}</textarea>
        </div>
        <div class="job-total">
          <span class="kpi-label">Total so far</span>
          <span class="kpi-value tabular">${fmtRM(sum.total)}</span>
          ${job.status === 'paid'
            ? html`<a class="btn btn-primary btn-lg" href="#/invoice/${job.invoiceNo}">${icon('receipt')} Invoice ${job.invoiceNo}</a>`
            : job.status === 'ready' && job.lines.length
              ? html`<a class="btn btn-primary btn-lg" href="#/admin/checkout/${job.id}">${icon('cash')} Charge</a>`
              : html`<button class="btn btn-primary btn-lg" disabled>${icon('cash')} Charge</button>
                     <span class="field-hint">${job.lines.length ? 'Move the job to Ready to charge.' : 'Add labour or parts first.'}</span>`}
        </div>
      </section>`;
  },
  inputs: {
    status(el) {
      const id = location.hash.split('/').pop();
      setJobStatus(id, el.value);
      toast(`Moved to ${statusLabel(el.value)}`);
      el.blur();
      refresh({ force: true });
    },
    mechanic(el) { assignMechanic(location.hash.split('/').pop(), el.value); el.blur(); refresh({ force: true }); },
    bay(el) { setJobBay(location.hash.split('/').pop(), el.value); el.blur(); refresh({ force: true }); },
    notes(el, event) { if (event.type === 'change') setJobNotes(location.hash.split('/').pop(), el.value); },
    'part-search'(el) {
      partQuery = el.value.trim().toLowerCase();
      document.querySelectorAll('.part-list li').forEach((li) => {
        li.hidden = Boolean(partQuery) && !li.dataset.search.includes(partQuery);
      });
    },
  },
  actions: {
    'add-part'(el) {
      const result = addPartLine(location.hash.split('/').pop(), el.dataset.id, 1);
      toast(result.ok ? 'Part added, stock updated' : result.reason || 'Could not add that part');
    },
    qty(el) {
      const result = changeLineQty(location.hash.split('/').pop(), el.dataset.line, Number(el.dataset.delta));
      if (!result.ok && result.reason) toast(result.reason);
    },
    'remove-line'(el) {
      removeLine(location.hash.split('/').pop(), el.dataset.line);
      toast('Removed');
    },
  },
  submits: {
    'add-service'(form) {
      addServiceLine(location.hash.split('/').pop(), new FormData(form).get('serviceId'));
      toast('Labour added');
    },
  },
});
