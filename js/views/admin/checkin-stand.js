// #/admin/checkin-stand — the counter stand, ready to print on A5: the signboard, SCAN TO CHECK IN,
// the QR that opens #/checkin, and the opening hours. Only the stand prints.

import { html, fmtSlot } from '../../ui.js';
import { STATE } from '../../state.js';
import { qrSvg } from '../../qr.js';
import { absUrl } from '../../share.js';
import { icon } from '../icons.js';
import { requireAdmin } from '../login.js';

export const checkinStandPage = {
  title: 'Check-in stand',
  surface: 'stand',
  guard: requireAdmin,
  render() {
    return html`
      <div class="stand-page">
        <div class="no-print stand-actions">
          <button class="btn btn-primary" data-action="print">${icon('printer')} Print (A5)</button>
          <a class="btn btn-ghost" href="#/admin/settings">${icon('back', { size: 16 })} Back to settings</a>
        </div>
        <article class="stand">
          <span class="signboard-name stand-sign">${STATE.shop.name}</span>
          <p class="stand-tag">${STATE.shop.tagline}</p>
          <h1 class="stand-title">Scan to<br>check in</h1>
          <div class="qr stand-qr">${qrSvg(absUrl('/checkin'), { label: 'Scan to check in' })}</div>
          <p class="stand-sub">No queue at the counter.<br>Your slip and live job tracking come to your phone.</p>
          <p class="stand-foot">Open ${fmtSlot(STATE.shop.hoursOpen)} – ${fmtSlot(STATE.shop.hoursClose)} · ${STATE.shop.phone}</p>
        </article>
      </div>`;
  },
  actions: {
    print() { window.print(); },
  },
};
