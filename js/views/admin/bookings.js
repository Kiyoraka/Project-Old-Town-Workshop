// #/admin/bookings — the day as a time × bay grid, stepped day by day, with the bookings still
// waiting to be confirmed listed on top. A booking opens a sheet: confirm it (and send the
// confirmation on WhatsApp), check it in as a job, or cancel it with a second tap — never a
// browser dialog.

import { html, fmtDay, fmtSlot, dayStr, addDays, toast } from '../../ui.js';
import { STATE, bookingsOn, bookingById, serviceById, bayById, setBookingStatus, checkIn } from '../../state.js';
import { SLOTS } from '../../data.js';
import { refresh, navigate } from '../../router.js';
import { waLink } from '../../share.js';
import { plate, bookingPill } from '../public.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let day = null;
let openId = null;
let confirmCancel = false;

function cell(booking) {
  if (!booking) return html`<td class="slot-free"><span>free</span></td>`;
  return html`
    <td>
      <button class="slot-booking is-${booking.status}" data-action="open" data-id="${booking.id}">
        <span class="mono">${booking.id}</span>
        ${plate(booking.plate)}
        <span class="slot-service">${serviceById(booking.serviceId)?.name}</span>
      </button>
    </td>`;
}

function confirmText(b) {
  return `Salam ${b.name}, tempahan ${b.id} di ${STATE.shop.name} DISAHKAN.\n${fmtDay(b.date)}, ${fmtSlot(b.time)} · ${bayById(b.bay)?.name}\n${serviceById(b.serviceId)?.name} · ${b.plate}\nJumpa nanti!`;
}

function sheet() {
  const b = bookingById(openId);
  if (!b) return '';
  const today = b.date === dayStr();
  return html`
    <div class="sheet-backdrop" data-action="close" data-self>
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="bk-title">
        <div class="modal-head"><h2 class="sign-title" id="bk-title">${b.id}</h2>${bookingPill(b.status)}<span class="spacer"></span>
          <button class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="facts">
            <div class="fact"><span>Day</span><b>${fmtDay(b.date)}</b></div>
            <div class="fact"><span>Time</span><b>${fmtSlot(b.time)}</b></div>
            <div class="fact"><span>Bay</span><b>${bayById(b.bay)?.name}</b></div>
            <div class="fact"><span>Car</span><b>${plate(b.plate)}</b></div>
          </div>
          <p><b>${serviceById(b.serviceId)?.name}</b><br><span class="muted">${b.model} · ${b.name} · ${b.phone}</span></p>
          ${b.notes ? html`<p class="asof">${b.notes}</p>` : ''}
        </div>
        <div class="modal-foot">
          ${b.status === 'pending' ? html`<button class="btn btn-patina" data-action="confirm">${icon('check')} Confirm</button>` : ''}
          ${b.status === 'confirmed' ? html`<a class="btn btn-wa" href="${waLink(b.phone, confirmText(b))}" target="_blank" rel="noopener">${icon('whatsapp')} Send confirmation</a>` : ''}
          ${['pending', 'confirmed'].includes(b.status) && today ? html`<button class="btn btn-primary" data-action="check-in">${icon('qr')} Check in</button>` : ''}
          ${b.status === 'checked-in' && b.jobId ? html`<a class="btn btn-outline" href="#/admin/job/${b.jobId}">Open ${b.jobId}</a>` : ''}
          ${['pending', 'confirmed'].includes(b.status) ? html`
            <button class="btn btn-ghost btn-danger" data-action="cancel">${confirmCancel ? 'Tap again to cancel' : 'Cancel booking'}</button>` : ''}
        </div>
      </section>
    </div>`;
}

export const bookingsPage = adminPage({
  active: 'bookings',
  title: 'Bookings',
  render() {
    if (!day) day = dayStr();
    const list = bookingsOn(day).filter((b) => b.status !== 'cancelled');
    const cancelled = bookingsOn(day).filter((b) => b.status === 'cancelled');
    const pending = STATE.bookings.filter((b) => b.status === 'pending').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return html`
      ${pending.length ? html`
        <section class="card pending-card">
          <div class="card-head"><h2 class="sign-title">Waiting to confirm</h2><span class="status status-pending">${pending.length}</span></div>
          <ul class="list">
            ${pending.map((b) => html`
              <li>
                <span class="list-time mono">${fmtDay(b.date)}<br>${fmtSlot(b.time)}</span>
                <span class="list-main">${plate(b.plate)} <b>${serviceById(b.serviceId)?.name}</b><span class="cell-sub">${b.name} · ${b.phone}</span></span>
                <button class="btn btn-ghost btn-sm" data-action="open" data-id="${b.id}">Details</button>
                <button class="btn btn-patina btn-sm" data-action="quick-confirm" data-id="${b.id}">${icon('check', { size: 14 })} Confirm</button>
              </li>`)}
          </ul>
        </section>` : ''}
      <section class="card">
        <div class="toolbar">
          <h2 class="sign-title">${fmtDay(day)}${day === dayStr() ? ' · today' : ''}</h2>
          <div class="row" style="gap:6px">
            <button class="icon-btn" data-action="day" data-step="-1" aria-label="Previous day">${icon('back')}</button>
            <button class="btn btn-ghost btn-sm" data-action="today">Today</button>
            <button class="icon-btn" data-action="day" data-step="1" aria-label="Next day">${icon('arrow')}</button>
          </div>
        </div>
        <p class="muted small">${list.length} booked${cancelled.length ? ` · ${cancelled.length} cancelled` : ''} · customers book online at #/book, walk-ins check in from Jobs.</p>
        <div class="table-wrap">
          <table class="slot-table">
            <thead><tr><th>Time</th>${STATE.bays.map((bay) => html`<th>${bay.name}<span class="cell-sub">${bay.label}</span></th>`)}</tr></thead>
            <tbody>
              ${SLOTS.map((time) => html`
                <tr>
                  <th class="mono">${fmtSlot(time)}</th>
                  ${STATE.bays.map((bay) => cell(list.find((b) => b.time === time && b.bay === bay.id)))}
                </tr>
                ${time === '12:00' ? html`<tr class="slot-lunch"><th class="mono">1:00 PM</th><td colspan="${STATE.bays.length}">Lunch</td></tr>` : ''}`)}
            </tbody>
          </table>
        </div>
      </section>
      ${openId ? sheet() : ''}`;
  },
  actions: {
    day(el) { day = addDays(day, Number(el.dataset.step)); refresh({ force: true }); },
    today() { day = dayStr(); refresh({ force: true }); },
    open(el) { openId = el.dataset.id; confirmCancel = false; refresh({ force: true }); },
    close() { openId = null; refresh({ force: true }); },
    confirm() { setBookingStatus(openId, 'confirmed'); toast('Booking confirmed'); refresh({ force: true }); },
    'quick-confirm'(el) { setBookingStatus(el.dataset.id, 'confirmed'); toast(`${el.dataset.id} confirmed`); },
    'check-in'() {
      const { job } = checkIn({ bookingId: openId });
      openId = null;
      toast(`${job.plate} checked in as ${job.id}`);
      navigate(`/admin/job/${job.id}`);
    },
    cancel() {
      if (!confirmCancel) { confirmCancel = true; refresh({ force: true }); return; }
      setBookingStatus(openId, 'cancelled');
      toast(`${openId} cancelled`);
      openId = null;
      confirmCancel = false;
      refresh({ force: true });
    },
  },
});
