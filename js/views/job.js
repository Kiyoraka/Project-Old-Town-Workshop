// #/job/:id — what the customer sees after scanning the slip: a five-stage stepper, who is on
// the car and in which bay, a rough ready-by time, the work on the job, and the invoice once paid.
// A job this browser knows is live (it moves when the workshop moves it, even from another tab);
// a job from a shared link is shown as of the moment it was shared. #/track finds a job by plate
// or job number.

import { html, fmtTime, plateKey } from '../ui.js';
import { STATE, jobById, staffById, bayById, etaFor, statusLabel } from '../state.js';
import { JOB_STATUSES } from '../data.js';
import { queryParam, navigate, refresh } from '../router.js';
import { decode, expandJob, preferLive } from '../share.js';
import { publicHeader, publicFooter, plate, statusPill } from './public.js';
import { icon } from './icons.js';
import { rememberJob } from './guest-dock.js';

function liveView(job) {
  return {
    id: job.id, status: job.status, plate: job.plate, model: job.model, name: job.name,
    bayName: job.bay ? bayById(job.bay)?.name : null, mechanicName: staffById(job.mechanicId)?.name || null,
    queueNo: job.queueNo, checkedInAt: job.checkedInAt, eta: etaFor(job), invoiceNo: job.invoiceNo,
    lines: job.lines.map((l) => ({ name: l.name, qty: l.qty })), asOf: null,
  };
}

function nowLine(v) {
  return {
    'checked-in': ['We have your car.', 'A mechanic will look at it soon. You are in the queue.'],
    inspecting: ['Inspecting now.', `${v.mechanicName || 'Our mechanic'} is checking what your car needs.`],
    'in-service': ['Work in progress.', `${v.mechanicName || 'Our mechanic'} is working on it${v.bayName ? ` in ${v.bayName}` : ''}.`],
    ready: ['Ready for pickup!', 'Come to the counter to pay and collect your keys.'],
    paid: ['Paid. Drive safe!', 'Thank you. Your invoice is below.'],
  }[v.status] || ['', ''];
}

function stepper(status) {
  const at = JOB_STATUSES.findIndex((s) => s.id === status);
  return html`
    <ol class="stepper" aria-label="Job progress">
      ${JOB_STATUSES.map((s, i) => html`
        <li class="${i < at || status === 'paid' ? 'is-done' : i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}>
          <span class="dot">${icon('check')}</span>${s.short}
        </li>`)}
    </ol>`;
}

const expired = (id) => html`
  ${publicHeader()}
  <main class="container narrow flow">
    <div class="card empty">
      ${icon('alert', { size: 36 })}
      <h1 class="sign-title">This link has expired</h1>
      <p>We could not find job ${id}. Ask at the counter, or look it up by your plate.</p>
      <a class="btn btn-primary" href="#/track">Track a job</a>
    </div>
  </main>
  ${publicFooter()}`;

export const jobPage = {
  title: 'Track my job',
  dock: 'job',
  render({ id }) {
    const live = jobById(id);
    const snap = expandJob(decode(queryParam('d')));
    const view = preferLive(live ? liveView(live) : null, snap && snap.id === id ? snap : null);
    if (!view) return expired(id);
    rememberJob(view.id, location.hash);   // a slip QR scanned on this phone stays one tap away
    const [headline, detail] = nowLine(view);
    return html`
      ${publicHeader({ strip: `Job ${view.id} · ${statusLabel(view.status)}` })}
      <main class="container narrow flow">
        <section class="card">
          <div class="tracker-head">
            <span class="slip-no">${view.id}</span>
            ${plate(view.plate, { large: true })}
            <span class="muted">${view.model}</span>
            <span class="spacer"></span>
            ${statusPill(view.status)}
          </div>
          ${stepper(view.status)}
          <p class="now-line">${headline}</p>
          <p class="muted">${detail}</p>
          ${view.asOf ? html`<p class="asof">${icon('clock', { size: 14 })} Status as of ${fmtTime(view.asOf)}, when this link was shared. Open the link again later, or ask at the counter, for the latest.</p>` : ''}
          <div class="facts">
            <div class="fact"><span>Queue</span><b>#${view.queueNo}</b></div>
            <div class="fact"><span>Mechanic</span><b>${view.mechanicName || '—'}</b></div>
            <div class="fact"><span>Bay</span><b>${view.bayName || (view.status === 'ready' ? 'Pickup line' : '—')}</b></div>
            <div class="fact"><span>${view.status === 'ready' || view.status === 'paid' ? 'Checked in' : 'Ready by ~'}</span>
              <b>${view.status === 'ready' || view.status === 'paid' ? fmtTime(view.checkedInAt) : view.eta ? fmtTime(view.eta) : '—'}</b></div>
          </div>
          <p class="section-label">Work on your car</p>
          ${view.lines.length ? html`
            <ul class="work-list">${view.lines.map((l) => html`<li><span>${l.qty}×</span><span>${l.name}</span></li>`)}</ul>`
            : html`<p class="muted">Nothing added yet. The mechanic adds parts and labour after the inspection.</p>`}
          ${view.invoiceNo ? html`
            <a class="btn btn-primary btn-block" style="margin-top:14px" href="#/invoice/${view.invoiceNo}">${icon('receipt')} View invoice ${view.invoiceNo}</a>` : ''}
        </section>
        <p class="muted small" style="margin-top:12px">${icon('refresh', { size: 14 })} This page updates on its own while the workshop works on your car.</p>
      </main>
      ${publicFooter()}`;
  },
};

let trackQuery = '';
let trackError = '';

export const trackPage = {
  title: 'Track my job',
  dock: 'job',
  render() {
    return html`
      ${publicHeader({ strip: 'Track my job' })}
      <main class="container narrow flow">
        <a class="back-link" href="#/">${icon('back', { size: 16 })} Back</a>
        <form class="card stack" data-submit="track" novalidate>
          <h1 class="sign-title">Where is my car?</h1>
          <div class="field">
            <label for="track-q">Plate number or job number</label>
            <input id="track-q" class="input input-plate" name="q" value="${trackQuery}" data-input="q" autocomplete="off" aria-invalid="${trackError ? 'true' : 'false'}">
            ${trackError ? html`<span class="field-error">${trackError}</span>` : html`<span class="field-hint">Like WXY 1234, or JOB-0412 from your slip.</span>`}
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('search')} Find my job</button>
        </form>
      </main>
      ${publicFooter()}`;
  },
  inputs: { q(el) { trackQuery = el.value; } },
  submits: {
    track() {
      const text = trackQuery.trim().toUpperCase();
      const byId = jobById(text) || jobById(`JOB-${text.replace(/\D/g, '').padStart(4, '0')}`);
      const byPlate = [...STATE.jobs].reverse().find((j) => plateKey(j.plate) === plateKey(text));
      const job = /^JOB/.test(text) ? byId : byPlate || byId;
      if (!job) { trackError = 'No job found for that plate or number today.'; refresh({ force: true }); return; }
      trackError = '';
      trackQuery = '';
      navigate(`/job/${job.id}`);
    },
  },
};
