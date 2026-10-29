// #/admin/jobs — the job board: one column per stage (paid shows today only), each job a card
// with its plate, work, mechanic, bay, running total and time since check-in. A card opens the
// job card; "Next" moves it one stage on; a ready job has Charge. Search filters in place. On a
// phone the board is one column picked with status chips. + Walk-in checks a car in here.

import { html, fmtRM, plateKey, toast } from '../../ui.js';
import { STATE, jobsByStatus, staffById, bayById, jobTotal, setJobStatus, checkIn, statusLabel, vehicleByPlate } from '../../state.js';
import { JOB_STATUSES } from '../../data.js';
import { navigate, refresh } from '../../router.js';
import { plate, statusPill } from '../public.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let phoneStage = 'checked-in';
let query = '';
let walkIn = null;        // draft while the walk-in modal is open
let walkInErrors = {};

const NEXT = { 'checked-in': 'inspecting', inspecting: 'in-service', 'in-service': 'ready' };

function minutesSince(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const searchText = (job) => `${job.id} ${plateKey(job.plate)} ${job.plate} ${job.name} ${job.model}`.toLowerCase();

function jobCard(job) {
  const service = job.lines.find((l) => l.kind === 'service')?.name;
  const hidden = query && !searchText(job).includes(query);
  return html`
    <article class="job-card" data-search="${searchText(job)}" ${hidden ? 'hidden' : ''}>
      <a class="job-card-link" href="#/admin/job/${job.id}" aria-label="Open ${job.id}">
        <span class="job-card-top"><span class="mono">${job.id} <span class="muted">#${job.queueNo}</span></span><b class="tabular">${job.lines.length ? fmtRM(jobTotal(job)) : ''}</b></span>
        <span class="job-card-car">${plate(job.plate)}<span class="muted small">${job.model}</span></span>
        <span class="job-card-what">${service || (job.lines.length ? job.lines[0].name : 'Needs inspection')}</span>
        <span class="job-card-meta">
          ${icon('user', { size: 14 })} ${staffById(job.mechanicId)?.name || html`<i>Unassigned</i>`}
          ${job.bay ? html` · ${bayById(job.bay)?.name}` : ''}
        </span>
        <span class="job-card-meta">${icon('clock', { size: 14 })} ${job.status === 'paid' ? job.invoiceNo : `In for ${minutesSince(job.checkedInAt)}`}</span>
      </a>
      ${NEXT[job.status] ? html`
        <div class="job-card-actions">
          <button class="btn btn-ghost btn-sm" data-action="advance" data-id="${job.id}" title="Move to the next stage">${statusLabel(NEXT[job.status])} ${icon('arrow', { size: 14 })}</button>
        </div>` : ''}
      ${job.status === 'ready' ? html`
        <div class="job-card-actions"><a class="btn btn-primary btn-sm btn-block" href="#/admin/checkout/${job.id}">${icon('cash', { size: 16 })} Charge</a></div>` : ''}
      ${job.status === 'paid' ? html`
        <div class="job-card-actions"><a class="btn btn-ghost btn-sm" href="#/invoice/${job.invoiceNo}">${icon('receipt', { size: 14 })} Invoice</a></div>` : ''}
    </article>`;
}

function walkInModal() {
  const f = (name, label, type = 'text', cls = '') => html`
    <div class="field">
      <label for="wi-${name}">${label}</label>
      <input id="wi-${name}" class="input ${cls}" type="${type}" name="${name}" value="${walkIn[name]}" data-input="walk-in" aria-invalid="${walkInErrors[name] ? 'true' : 'false'}">
      ${walkInErrors[name] ? html`<span class="field-error">${walkInErrors[name]}</span>` : ''}
    </div>`;
  return html`
    <div class="modal-backdrop" data-action="close-walk-in" data-self>
      <form class="modal" data-submit="walk-in" novalidate role="dialog" aria-modal="true" aria-labelledby="wi-title">
        <div class="modal-head"><h2 class="sign-title" id="wi-title">Walk-in</h2>
          <button type="button" class="icon-btn" data-action="close-walk-in" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="grid-2">
            ${f('plate', 'Plate number', 'text', 'input-plate')}
            ${f('model', 'Car model')}
            ${f('name', 'Customer name')}
            ${f('phone', 'WhatsApp number', 'tel')}
          </div>
          <div class="field">
            <label for="wi-service">Service</label>
            <select id="wi-service" class="select" name="serviceId" data-input="walk-in">
              <option value="">Inspect first</option>
              ${STATE.services.map((s) => html`<option value="${s.id}" ${walkIn.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`)}
            </select>
          </div>
          <div class="field">
            <label for="wi-notes">Complaint</label>
            <textarea id="wi-notes" class="textarea" name="notes" data-input="walk-in">${walkIn.notes}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-action="close-walk-in">Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')} Check in</button>
        </div>
      </form>
    </div>`;
}

export const jobsPage = adminPage({
  active: 'jobs',
  title: 'Jobs',
  render() {
    return html`
      <section class="card">
        <div class="toolbar">
          <h2 class="sign-title">Job board</h2>
          <label class="toolbar-search">${icon('search', { size: 16 })}<input class="input" type="search" placeholder="Plate, job or name" value="${query}" data-input="search" aria-label="Search jobs"></label>
          <button class="btn btn-primary btn-sm" data-action="open-walk-in">${icon('plus', { size: 16 })} Walk-in</button>
        </div>
        <div class="chips board-chips" role="group" aria-label="Stage">
          ${JOB_STATUSES.map((s) => html`<button class="chip" data-action="phone-stage" data-stage="${s.id}" aria-pressed="${phoneStage === s.id}">${s.short} <b>${jobsByStatus(s.id).length}</b></button>`)}
        </div>
        <div class="board" data-show="${phoneStage}">
          ${JOB_STATUSES.map((s) => {
            const jobs = jobsByStatus(s.id);
            return html`
              <section class="board-col" data-stage="${s.id}" aria-label="${s.label}">
                <header class="board-col-head">${statusPill(s.id)}<b class="tabular">${jobs.length}</b>
                  ${s.id === 'paid' ? html`<span class="muted small">${fmtRM(jobs.reduce((sum, j) => sum + jobTotal(j), 0))}</span>` : ''}</header>
                <div class="board-col-body">
                  ${jobs.length ? jobs.map(jobCard) : html`<p class="board-empty">Nothing here</p>`}
                </div>
              </section>`;
          })}
        </div>
      </section>
      ${walkIn ? walkInModal() : ''}`;
  },
  inputs: {
    search(el) {
      query = el.value.trim().toLowerCase();
      document.querySelectorAll('.job-card').forEach((card) => {
        card.hidden = Boolean(query) && !card.dataset.search.includes(query);
      });
    },
    'walk-in'(el, event) {
      walkIn[el.name] = el.value;
      if (el.name === 'plate' && event.type === 'change') {
        const known = vehicleByPlate(el.value);
        if (known && !walkIn.model) {
          Object.assign(walkIn, { model: known.model, name: known.name, phone: known.phone });
          ['model', 'name', 'phone'].forEach((n) => { document.getElementById(`wi-${n}`).value = walkIn[n]; });
        }
      }
    },
  },
  actions: {
    'phone-stage'(el) { phoneStage = el.dataset.stage; refresh({ force: true }); },
    advance(el) {
      const id = el.dataset.id;
      const job = STATE.jobs.find((j) => j.id === id);
      const next = NEXT[job.status];
      setJobStatus(id, next);
      toast(`${job.plate} moved to ${statusLabel(next)}`);
    },
    'open-walk-in'() {
      walkIn = { plate: '', model: '', name: '', phone: '', serviceId: '', notes: '' };
      walkInErrors = {};
      refresh({ force: true });
      document.getElementById('wi-plate')?.focus();
    },
    'close-walk-in'() { walkIn = null; refresh({ force: true }); },
  },
  submits: {
    'walk-in'() {
      walkInErrors = {};
      if (plateKey(walkIn.plate).length < 2) walkInErrors.plate = 'Enter the plate number.';
      if (!walkIn.model.trim()) walkInErrors.model = 'Enter the car model.';
      if (!walkIn.name.trim()) walkInErrors.name = 'Enter the customer name.';
      if (walkIn.phone.replace(/\D/g, '').length < 9) walkInErrors.phone = 'Enter a phone number.';
      if (Object.keys(walkInErrors).length) { refresh({ force: true }); return; }
      const { job } = checkIn({ ...walkIn });
      walkIn = null;
      toast(`${job.plate} checked in as ${job.id}`);
      navigate(`/admin/job/${job.id}`);
    },
  },
});
