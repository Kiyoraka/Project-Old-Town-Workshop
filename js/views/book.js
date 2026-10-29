// #/book — a customer books a slot in three short sections: the service, a day and a free slot
// (a slot already full in every bay, or already past today, is disabled), then the car and a
// contact number. A known plate fills in the car and name. #/booked/:id is the confirmation,
// with a QR the customer shows (or scans) at the counter and a WhatsApp share.

import { html, fmtRM, fmtDay, fmtSlot, dayStr, addDays, plateKey } from '../ui.js';
import { STATE, slotsFor, createBooking, bookingById, serviceById, bayById, vehicleByPlate } from '../state.js';
import { refresh, navigate } from '../router.js';
import { qrSvg } from '../qr.js';
import { absUrl, waLink } from '../share.js';
import { publicHeader, publicFooter, plate, bookingPill } from './public.js';
import { icon } from './icons.js';

const blank = () => ({ serviceId: '', date: '', time: '', plate: '', model: '', name: '', phone: '', notes: '' });
let draft = blank();
let errors = {};

// The next seven open days (the workshop is closed on Sunday).
function bookableDays() {
  const days = [];
  for (let i = 0; days.length < 7 && i < 10; i++) {
    const day = addDays(dayStr(), i);
    const [y, m, d] = day.split('-').map(Number);
    if (new Date(y, m - 1, d).getDay() !== 0) days.push(day);
  }
  return days;
}

function validate() {
  const e = {};
  if (!draft.serviceId) e.serviceId = 'Pick a service.';
  if (!draft.date || !draft.time) e.time = 'Pick a day and a time.';
  if (plateKey(draft.plate).length < 2) e.plate = 'Enter the car plate number.';
  if (!draft.model.trim()) e.model = 'Enter the car model.';
  if (!draft.name.trim()) e.name = 'Enter your name.';
  if (draft.phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a phone number we can WhatsApp.';
  return e;
}

function field(name, label, { type = 'text', cls = '', hint = '', autocomplete = 'off' } = {}) {
  return html`
    <div class="field">
      <label for="book-${name}">${label}</label>
      <input id="book-${name}" class="input ${cls}" type="${type}" name="${name}" value="${draft[name]}" data-input="draft"
             autocomplete="${autocomplete}" aria-invalid="${errors[name] ? 'true' : 'false'}">
      ${errors[name] ? html`<span class="field-error">${errors[name]}</span>` : hint ? html`<span class="field-hint">${hint}</span>` : ''}
    </div>`;
}

export const bookPage = {
  title: 'Book a slot',
  dock: 'book',
  render() {
    const days = bookableDays();
    if (!draft.date) draft.date = days.find((d) => slotsFor(d).some((s) => s.free.length)) || days[0];
    const slots = slotsFor(draft.date);
    const service = serviceById(draft.serviceId);
    return html`
      ${publicHeader({ strip: 'Book a slot · we confirm on WhatsApp' })}
      <main class="container narrow flow">
        <a class="back-link" href="#/">${icon('back', { size: 16 })} Back</a>
        <div class="flow-head"><h1 class="sign-title">Book a slot</h1><span class="flow-step">3 short steps</span></div>
        <form class="stack-lg" data-submit="book" novalidate>
          <section class="card">
            <p class="section-label">1 · Service</p>
            <div class="service-pick" role="group" aria-label="Service">
              ${STATE.services.map((s) => html`
                <button type="button" class="service-option" data-action="pick-service" data-id="${s.id}" aria-pressed="${draft.serviceId === s.id}">
                  <span><b>${s.name}</b><span class="muted">${s.category} · about ${s.minutes} min</span></span>
                  <span class="price">${fmtRM(s.price)}</span>
                </button>`)}
            </div>
            ${errors.serviceId ? html`<p class="field-error">${errors.serviceId}</p>` : ''}
            <p class="field-hint">Labour price. Parts are quoted after inspection.</p>
          </section>

          <section class="card stack">
            <p class="section-label">2 · Day and time</p>
            <div class="day-chips" role="group" aria-label="Day">
              ${days.map((d) => {
                const open = slotsFor(d).some((s) => s.free.length);
                const [weekday, ...rest] = fmtDay(d).split(' ');
                return html`
                  <button type="button" class="chip" data-action="pick-day" data-day="${d}" aria-pressed="${draft.date === d}" ${open ? '' : 'disabled'}>
                    <small>${d === dayStr() ? 'Today' : weekday}</small><b>${rest.join(' ')}</b>
                  </button>`;
              })}
            </div>
            <div class="slot-grid" role="group" aria-label="Time">
              ${slots.map((s) => html`
                <button type="button" class="chip" data-action="pick-time" data-time="${s.time}" aria-pressed="${draft.time === s.time}" ${s.free.length ? '' : 'disabled'}>
                  ${s.time}<small>${s.free.length ? `${s.free.length} bay${s.free.length > 1 ? 's' : ''} free` : 'Full'}</small>
                </button>`)}
            </div>
            ${errors.time ? html`<p class="field-error">${errors.time}</p>` : ''}
          </section>

          <section class="card stack">
            <p class="section-label">3 · Your car</p>
            <div class="grid-2">
              ${field('plate', 'Plate number', { cls: 'input-plate', hint: 'Like WXY 1234' })}
              ${field('model', 'Car model', { hint: 'Like Perodua Myvi' })}
              ${field('name', 'Your name', { autocomplete: 'name' })}
              ${field('phone', 'WhatsApp number', { type: 'tel', autocomplete: 'tel', hint: 'We confirm the booking here' })}
            </div>
            <div class="field">
              <label for="book-notes">What is the problem? (optional)</label>
              <textarea id="book-notes" class="textarea" name="notes" data-input="draft" placeholder="Bunyi berketuk depan kiri bila lalu bonggol...">${draft.notes}</textarea>
            </div>
          </section>

          <div class="summary-bar">
            ${icon('calendar', { size: 18 })}
            <span>${service ? service.name : 'No service yet'} · ${draft.date ? fmtDay(draft.date) : '—'} ${draft.time ? `· ${fmtSlot(draft.time)}` : ''}</span>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')} Confirm booking</button>
        </form>
      </main>
      ${publicFooter()}`;
  },
  inputs: {
    draft(el, event) {
      draft[el.name] = el.value;
      // A plate we already know fills in the car and the owner, once, when the field is left.
      if (el.name === 'plate' && event.type === 'change') {
        const known = vehicleByPlate(el.value);
        if (known && !draft.model && !draft.name) {
          Object.assign(draft, { model: known.model, name: known.name, phone: draft.phone || known.phone });
          refresh({ force: true });
        }
      }
    },
  },
  actions: {
    'pick-service'(el) { draft.serviceId = el.dataset.id; delete errors.serviceId; refresh({ force: true }); },
    'pick-day'(el) { draft.date = el.dataset.day; draft.time = ''; refresh({ force: true }); },
    'pick-time'(el) { draft.time = el.dataset.time; delete errors.time; refresh({ force: true }); },
  },
  submits: {
    book(form) {
      errors = validate();
      if (Object.keys(errors).length) {
        refresh({ force: true });
        document.querySelector('.field-error')?.closest('.card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const result = createBooking({ ...draft });
      if (!result.ok) {
        errors = { time: result.reason };
        draft.time = '';
        refresh({ force: true });
        return;
      }
      draft = blank();
      errors = {};
      navigate(`/booked/${result.booking.id}`);
    },
  },
};

export const bookedPage = {
  title: 'Booked',
  dock: 'book',
  render({ id }) {
    const booking = bookingById(id);
    if (!booking) {
      return html`${publicHeader()}<main class="container narrow flow"><div class="card empty">
        <p>We could not find booking ${id} in this browser.</p><a class="btn btn-primary" href="#/book">Book a slot</a></div></main>`;
    }
    const service = serviceById(booking.serviceId);
    const share = `Tempahan ${booking.id} di ${STATE.shop.name}\n${fmtDay(booking.date)}, ${fmtSlot(booking.time)} · ${bayById(booking.bay)?.name}\n${service?.name} · ${booking.plate}\nDaftar masuk: ${absUrl(`/checkin?code=${booking.id}`)}`;
    return html`
      ${publicHeader({ strip: 'Booking received' })}
      <main class="container narrow flow">
        <section class="card done-card">
          <div class="row"><span class="done-mark">${icon('check')}</span><div>
            <h1 class="sign-title" style="margin:0">Booked!</h1>
            <span class="muted">We will confirm on WhatsApp. ${bookingPill(booking.status)}</span>
          </div></div>
          <p class="code-line">${booking.id}</p>
          <div class="facts">
            <div class="fact"><span>Day</span><b>${fmtDay(booking.date)}</b></div>
            <div class="fact"><span>Time</span><b>${fmtSlot(booking.time)}</b></div>
            <div class="fact"><span>Bay</span><b>${bayById(booking.bay)?.name}</b></div>
            <div class="fact"><span>Car</span><b>${plate(booking.plate)}</b></div>
          </div>
          <p><b>${service?.name}</b><br><span class="muted">${booking.model} · ${booking.name}</span></p>
          <div class="qr-row">
            <div class="qr">${qrSvg(absUrl(`/checkin?code=${booking.id}`), { label: `QR code to check in booking ${booking.id}` })}</div>
            <p class="muted small">Show this at the counter when you arrive, or just say your plate. Scanning it opens check-in with your booking ready.</p>
          </div>
          <div class="row">
            <a class="btn btn-wa" href="${waLink('', share)}" target="_blank" rel="noopener">${icon('whatsapp')} Share on WhatsApp</a>
            <a class="btn btn-ghost" href="#/">Back to the workshop</a>
          </div>
        </section>
      </main>
      ${publicFooter()}`;
  },
};
