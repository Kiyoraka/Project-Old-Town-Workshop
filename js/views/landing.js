// #/ — the workshop's front door: the signboard, three ways in (book, check in, track), how a
// visit works, what the workshop does with "from" prices, the counter's check-in QR, and the
// bays as they are right now.

import { html, fmtRM, fmtSlot } from '../ui.js';
import { STATE, bayBoard } from '../state.js';
import { qrSvg } from '../qr.js';
import { absUrl } from '../share.js';
import { publicHeader, publicFooter } from './public.js';
import { icon } from './icons.js';

const CATEGORY_COPY = {
  Absorber: { icon: 'wrench', text: 'Front and rear absorbers, mountings and coilovers, fitted the same day.', photo: 'assets/images/absorber-fitting.webp', alt: 'A mechanic fitting a shock absorber' },
  Restoration: { icon: 'sparkle', text: 'Worn absorbers rebuilt with new seals and oil, for classics and daily cars.', photo: 'assets/images/absorber-restored.webp', alt: 'A reconditioned absorber on a workbench' },
  Alignment: { icon: 'car', text: 'Wheel alignment and balancing on our own bay.', photo: 'assets/images/wheel-alignment.webp', alt: 'A car on the alignment lift with targets clamped to the wheels' },
  Servis: { icon: 'shield', text: 'Engine oil, filters, bushes and links.', photo: 'assets/images/engine-oil-service.webp', alt: 'Fresh engine oil pouring through a funnel' },
  Brek: { icon: 'alert', text: 'Brake pads and fluid, checked on every visit.', photo: 'assets/images/brake-service.webp', alt: 'A new brake pad going into the caliper' },
  'Tayar & bateri': { icon: 'tyre', text: 'Tyres changed and balanced, punctures fixed, batteries tested and swapped while you wait.', photo: 'assets/images/tyre-battery.webp', alt: 'A new tyre on the wheel balancer with a battery and multimeter on the bench' },
};

function serviceCards() {
  const byCategory = new Map();
  STATE.services.filter((s) => s.category !== 'Inspection').forEach((s) => {
    const from = byCategory.get(s.category);
    if (!from || s.price < from) byCategory.set(s.category, s.price);
  });
  return [...byCategory.entries()].map(([category, from]) => {
    const copy = CATEGORY_COPY[category] || { icon: 'wrench', text: '' };
    return html`
      <article class="service-card ${copy.photo ? 'has-photo' : ''}">
        ${copy.photo ? html`<img class="service-photo" src="${copy.photo}" alt="${copy.alt}" loading="lazy" width="600" height="400" onerror="this.remove()">` : ''}
        <div class="service-body">
          <span class="service-icon">${icon(copy.icon, { size: 22 })}</span>
          <h3 class="service-name">${category}</h3>
          <p class="muted">${copy.text}</p>
          <span class="badge-brass">from ${fmtRM(from)}</span>
        </div>
      </article>`;
  });
}

export const landing = {
  render() {
    const board = bayBoard();
    const busy = board.filter((b) => b.job).length;
    return html`
      ${publicHeader({ strip: 'Bookings · QR check-in · Live job tracking · Invoice on WhatsApp' })}
      <main class="landing">
        <section class="hero container">
          <div class="hero-copy">
            <p class="eyebrow">Old Town · absorber specialists</p>
            <h1 class="display">Ride smooth again.</h1>
            <p class="hero-lead">Book a slot from your phone, scan the QR at our counter when you arrive, and watch your car move from inspection to ready. Pay how you like and the invoice lands on your WhatsApp.</p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="#/book">${icon('calendar')} Book a slot</a>
              <a class="btn btn-outline btn-lg" href="#/checkin">${icon('qr')} I'm here: check in</a>
              <a class="btn btn-ghost btn-lg" href="#/track">${icon('search')} Track my job</a>
            </div>
          </div>
          <figure class="hero-figure">
            <img src="assets/images/hero-workshop.webp" alt="The Old Town Workshop shophouse in late sun, patina shutters up and a white hatchback on the lift" width="1200" height="800" onerror="this.remove()">
            <span class="hero-badge badge-brass">${icon('wrench', { size: 14 })} ${busy} of ${board.length} bays busy now</span>
          </figure>
        </section>

        <section class="container section">
          <h2 class="sign-title">How a visit works</h2>
          <ol class="steps">
            <li><span class="step-no">1</span><b>Book</b><span class="muted">Pick a service, a day and a free slot.</span></li>
            <li><span class="step-no">2</span><b>Check in</b><span class="muted">Scan the counter QR or say your plate.</span></li>
            <li><span class="step-no">3</span><b>Follow</b><span class="muted">Your slip has a QR to track the job live.</span></li>
            <li><span class="step-no">4</span><b>Pay</b><span class="muted">DuitNow, FPX, card or cash. Invoice to WhatsApp.</span></li>
          </ol>
        </section>

        <section class="container section">
          <h2 class="sign-title">What we do</h2>
          <div class="services">${serviceCards()}</div>
        </section>

        <section class="container section counter-row">
          <div class="card counter-card">
            <div class="qr counter-qr">${qrSvg(absUrl('/checkin'), { label: 'QR code that opens check-in' })}</div>
            <div>
              <p class="eyebrow">At the counter</p>
              <h2 class="sign-title">Scan to check in</h2>
              <p class="muted">This is the QR on our counter stand. Scan it with your phone camera to check in without queueing.</p>
              <a class="btn btn-outline btn-sm" href="#/checkin">Open check-in here</a>
            </div>
          </div>
          <div class="card hours-card">
            <p class="eyebrow">Open today</p>
            <p class="hours">${fmtSlot(STATE.shop.hoursOpen)} – ${fmtSlot(STATE.shop.hoursClose)}</p>
            <p class="muted small">Lunch 1:00 – 2:00 PM · Closed Sunday</p>
            <p class="small">${icon('pin', { size: 16 })} ${STATE.shop.address}</p>
            <ul class="bay-strip" aria-label="Bays right now">
              ${board.map(({ bay, job }) => html`
                <li class="${job ? 'is-busy' : ''}"><b>${bay.name}</b><span>${job ? 'Busy' : 'Free'}</span></li>`)}
            </ul>
          </div>
        </section>
      </main>
      ${publicFooter()}`;
  },
};
