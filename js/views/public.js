// Shared pieces of the customer-facing pages: the rust signboard, the patina strip, the footer,
// the number-plate chip and the status pill.

import { html, fmtSlot } from '../ui.js';
import { STATE, statusLabel } from '../state.js';
import { installState } from '../pwa.js';
import { icon } from './icons.js';

export function publicHeader({ strip = '' } = {}) {
  return html`
    <header class="site-head">
      <div class="signboard">
        <div class="signboard-inner container">
          <a class="signboard-name" href="#/">${STATE.shop.name}</a>
          <span class="signboard-tag">${STATE.shop.tagline}</span>
        </div>
      </div>
      ${strip ? html`<div class="strip">${strip}</div>` : ''}
    </header>`;
}

export function publicFooter() {
  return html`
    <footer class="public-footer">
      <div class="container footer-inner">
        <div>
          <p class="footer-name">${STATE.shop.name}</p>
          <p class="muted small">${STATE.shop.address} · Open ${fmtSlot(STATE.shop.hoursOpen)} – ${fmtSlot(STATE.shop.hoursClose)}</p>
          <p class="muted small">A fictional workshop made for this demo. Every booking, job and invoice lives in this browser only.</p>
        </div>
        <a class="btn btn-outline btn-sm" href="#/login">Staff sign in</a>
      </div>
    </footer>`;
}

export function plate(value, { large = false } = {}) {
  return html`<span class="plate ${large ? 'plate-lg' : ''}">${value}</span>`;
}

export function statusPill(status) {
  return html`<span class="status status-${status}">${statusLabel(status)}</span>`;
}

export function bookingPill(status) {
  const label = { pending: 'Pending', confirmed: 'Confirmed', 'checked-in': 'Checked in', cancelled: 'Cancelled' }[status] || status;
  return html`<span class="status status-${status === 'checked-in' ? 'checked-in' : status}">${label}</span>`;
}

// "Install app" when the browser offers it, the Share hint on an iPhone, nothing once installed.
export function installChip() {
  const state = installState();
  if (state === 'prompt') {
    return html`<button class="install-chip" data-action="install">${icon('download', { size: 16 })} Install the app</button>`;
  }
  if (state === 'ios') {
    return html`<p class="install-hint">${icon('download', { size: 16 })} Add to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>`;
  }
  return '';
}
