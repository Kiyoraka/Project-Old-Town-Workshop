// #/ — the workshop's front door: the signboard, three ways in (book, check in, track), what the
// workshop does and when it is open.

import { html } from '../ui.js';
import { publicHeader, publicFooter } from './public.js';

export const landing = {
  render() {
    return html`
      ${publicHeader({ strip: 'Bookings · QR check-in · Live job tracking · Invoice on WhatsApp' })}
      <main class="landing">
        <section class="container section">
          <h1 class="display">Ride smooth again.</h1>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#/book">Book a slot</a>
            <a class="btn btn-outline btn-lg" href="#/checkin">I'm here: check in</a>
            <a class="btn btn-ghost btn-lg" href="#/track">Track my job</a>
          </div>
        </section>
      </main>
      ${publicFooter()}`;
  },
};
