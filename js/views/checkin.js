// #/checkin — the page the counter QR opens. The customer types a plate or a booking code (a
// booking QR arrives with ?code= already filled); today's booking is found as they type. No
// booking? Walk-ins are welcome: the car and a contact number are enough. Checking in opens a
// job and #/slip/:id prints a dashed slip with the queue number and a QR to follow the job.

import { html, fmtSlot, fmtDay, dayStr, plateKey } from '../ui.js';
import { STATE, findBookingForCheckIn, checkIn, jobById, serviceById, bayById, vehicleByPlate } from '../state.js';
import { navigate, queryParam, refresh } from '../router.js';
import { qrSvg } from '../qr.js';
import { jobLink } from '../share.js';
import { publicHeader, publicFooter, plate } from './public.js';
import { icon } from './icons.js';

let draft = { query: '', model: '', name: '', phone: '', serviceId: '', notes: '' };
let errors = {};
let lastCode = null;

// What the typed text matches: a booking to check in today, one on another day, one already in.
function lookup(query) {
  const booking = findBookingForCheckIn(query);
  if (!booking) return { kind: 'none' };
  if (booking.status === 'checked-in' && booking.jobId) return { kind: 'done', booking };
  if (booking.status === 'cancelled') return { kind: 'none' };
  if (booking.date === dayStr()) return { kind: 'today', booking };
  return { kind: 'other-day', booking };
}

function lookupHtml(query) {
  if (!query.trim()) return html`<p class="field-hint">Type your plate (like WXY 1234) or the code on your booking (like BK-0227).</p>`;
  const found = lookup(query);
  if (found.kind === 'today') {
    const b = found.booking;
    return html`<div class="found-booking">${icon('check', { size: 18 })}
      <span>Found <b>${b.id}</b> · ${fmtSlot(b.time)} · ${serviceById(b.serviceId)?.name} · ${b.plate}</span></div>`;
  }
  if (found.kind === 'done') {
    return html`<div class="found-booking">${icon('check', { size: 18 })}
      <span>${found.booking.id} is already checked in. <a href="#/slip/${found.booking.jobId}">Show my slip</a></span></div>`;
  }
  if (found.kind === 'other-day') {
    const b = found.booking;
    return html`<div class="found-booking is-warn">${icon('calendar', { size: 18 })}
      <span>Your booking ${b.id} is for ${fmtDay(b.date)}, ${fmtSlot(b.time)}. You can still check in today as a walk-in below.</span></div>`;
  }
  return html`<p class="field-hint">No booking found. Walk-ins are welcome: fill in the car below.</p>`;
}

const needsWalkIn = (query) => !['today', 'done'].includes(lookup(query).kind);

function walkInField(name, label, type = 'text') {
  return html`
    <div class="field">
      <label for="ci-${name}">${label}</label>
      <input id="ci-${name}" class="input" type="${type}" name="${name}" value="${draft[name]}" data-input="draft" aria-invalid="${errors[name] ? 'true' : 'false'}">
      ${errors[name] ? html`<span class="field-error">${errors[name]}</span>` : ''}
    </div>`;
}

export const checkinPage = {
  title: 'Check in',
  render() {
    const code = queryParam('code');
    if (code && code !== lastCode) { draft.query = code; lastCode = code; }
    const walkIn = needsWalkIn(draft.query);
    return html`
      ${publicHeader({ strip: 'Check in · no queue at the counter' })}
      <main class="container narrow flow">
        <div class="flow-head"><h1 class="sign-title">Check in</h1><span class="flow-step">${icon('qr', { size: 16 })} counter QR</span></div>
        <form class="card stack" data-submit="checkin" novalidate>
          <div class="field">
            <label for="ci-query">Plate number or booking code</label>
            <input id="ci-query" class="input input-plate" name="query" value="${draft.query}" data-input="query" autocomplete="off"
                   aria-invalid="${errors.query ? 'true' : 'false'}" aria-describedby="ci-lookup">
            ${errors.query ? html`<span class="field-error">${errors.query}</span>` : ''}
          </div>
          <div id="ci-lookup" aria-live="polite">${lookupHtml(draft.query)}</div>
          <fieldset class="stack walkin" id="ci-walkin" ${walkIn ? '' : 'hidden'} style="border:0;padding:0;margin:0">
            <p class="section-label">Walk-in</p>
            <div class="grid-2">
              ${walkInField('model', 'Car model')}
              ${walkInField('name', 'Your name')}
              ${walkInField('phone', 'WhatsApp number', 'tel')}
              <div class="field">
                <label for="ci-service">What do you need?</label>
                <select id="ci-service" class="select" name="serviceId" data-input="draft">
                  <option value="">Not sure yet, please inspect</option>
                  ${STATE.services.map((s) => html`<option value="${s.id}" ${draft.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`)}
                </select>
              </div>
            </div>
            <div class="field">
              <label for="ci-notes">What is the problem? (optional)</label>
              <textarea id="ci-notes" class="textarea" name="notes" data-input="draft">${draft.notes}</textarea>
            </div>
          </fieldset>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')} Check in</button>
        </form>
      </main>
      ${publicFooter()}`;
  },
  inputs: {
    query(el) {
      draft.query = el.value;
      // Update the lookup line and the walk-in fields in place, so typing keeps its focus.
      document.getElementById('ci-lookup').innerHTML = lookupHtml(draft.query).toString();
      document.getElementById('ci-walkin').hidden = !needsWalkIn(draft.query);
      const known = vehicleByPlate(draft.query);
      if (known && !draft.model && !draft.name) {
        Object.assign(draft, { model: known.model, name: known.name, phone: known.phone });
        ['model', 'name', 'phone'].forEach((n) => { document.getElementById(`ci-${n}`).value = draft[n]; });
      }
    },
    draft(el) { draft[el.name] = el.value; },
  },
  submits: {
    checkin() {
      errors = {};
      const found = lookup(draft.query);
      if (found.kind === 'done') { navigate(`/slip/${found.booking.jobId}`); return; }
      let result;
      if (found.kind === 'today') {
        result = checkIn({ bookingId: found.booking.id });
      } else {
        const plateText = found.kind === 'other-day' ? found.booking.plate : draft.query;
        if (plateKey(plateText).length < 2 || /^BK/i.test(plateText.trim())) errors.query = 'Enter your car plate number.';
        if (!draft.model.trim()) errors.model = 'Enter the car model.';
        if (!draft.name.trim()) errors.name = 'Enter your name.';
        if (draft.phone.replace(/\D/g, '').length < 9) errors.phone = 'Enter a phone number we can WhatsApp.';
        if (Object.keys(errors).length) { refresh({ force: true }); return; }
        result = checkIn({ plate: plateText, model: draft.model, name: draft.name, phone: draft.phone, serviceId: draft.serviceId, notes: draft.notes });
      }
      draft = { query: '', model: '', name: '', phone: '', serviceId: '', notes: '' };
      navigate(`/slip/${result.job.id}`);
    },
  },
};

export const slipPage = {
  title: 'Check-in slip',
  render({ id }) {
    const job = jobById(id);
    if (!job) {
      return html`${publicHeader()}<main class="container narrow flow"><div class="card empty">
        <p>Job ${id} is not in this browser.</p><a class="btn btn-primary" href="#/track">Track a job</a></div></main>`;
    }
    const services = job.lines.filter((l) => l.kind === 'service').map((l) => l.name);
    return html`
      ${publicHeader({ strip: 'You are checked in' })}
      <main class="container narrow flow">
        <div class="ticket slip">
          <div class="slip-top">
            <div><span class="muted small">JOB</span><div class="slip-no">${job.id}</div></div>
            <div class="slip-queue"><span class="muted small">QUEUE</span><b>#${job.queueNo}</b></div>
          </div>
          <hr class="slip-rule">
          <div>${plate(job.plate, { large: true })} <span class="muted">${job.model}</span></div>
          <div>${services.length ? services.join(' · ') : 'Inspection first, we will tell you what it needs'}</div>
          <div class="muted small">${job.bay ? `${bayById(job.bay)?.name} · ` : ''}Checked in ${new Date(job.checkedInAt).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })} · ${job.name}</div>
          <hr class="slip-rule">
          <div class="qr-row">
            <div class="qr">${qrSvg(jobLink(job), { label: `QR code to follow job ${job.id}` })}</div>
            <p class="small">Scan to follow your job live: inspecting, in service, ready. Keep this slip or take a screenshot.</p>
          </div>
        </div>
        <div class="row" style="margin-top:16px">
          <a class="btn btn-primary" href="#/job/${job.id}">${icon('search')} Track my job</a>
          <a class="btn btn-ghost" href="#/">Done</a>
        </div>
      </main>
      ${publicFooter()}`;
  },
};
