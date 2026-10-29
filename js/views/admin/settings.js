// #/admin/settings — the workshop's own details (they print on every invoice), invoice numbering
// and SST, where the WhatsApp invoice goes and what it says, the bays, the counter's check-in QR
// stand, and Reset demo data (a second tap confirms; never a browser dialog).

import { html, raw, fmtRMTight, toast } from '../../ui.js';
import { STATE, saveShop, saveSettings, saveBays, nextInvoiceNo, resetDemo } from '../../state.js';
import { refresh, navigate } from '../../router.js';
import { qrSvg } from '../../qr.js';
import { absUrl, invoiceWaText } from '../../share.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let confirmReset = false;

const text = (name, label, value, attrs = '') => html`
  <div class="field"><label for="set-${name}">${label}</label>
    <input id="set-${name}" class="input" name="${name}" value="${value}" ${raw(attrs)}></div>`;

export const settingsPage = adminPage({
  active: 'settings',
  title: 'Settings',
  render() {
    const { shop, settings } = STATE;
    const sample = [...STATE.invoices].pop();
    return html`
      <div class="settings-grid">
        <form class="card stack" data-submit="shop">
          <div class="card-head"><h2 class="sign-title">${icon('wrench', { size: 18 })} Workshop</h2><span class="spacer"></span><span class="muted small">prints on every invoice</span></div>
          ${text('name', 'Workshop name', shop.name)}
          ${text('tagline', 'Tagline', shop.tagline)}
          <div class="grid-2">
            ${text('ssm', 'SSM registration', shop.ssm)}
            ${text('phone', 'Phone', shop.phone)}
          </div>
          ${text('address', 'Address', shop.address)}
          <div class="grid-2">
            ${text('hoursOpen', 'Opens', shop.hoursOpen, 'type="time"')}
            ${text('hoursClose', 'Closes', shop.hoursClose, 'type="time"')}
          </div>
          <button class="btn btn-primary" type="submit">${icon('check')} Save workshop</button>
        </form>

        <form class="card stack" data-submit="invoice">
          <div class="card-head"><h2 class="sign-title">${icon('receipt', { size: 18 })} Invoice and tax</h2></div>
          ${text('invoicePrefix', 'Invoice number prefix', settings.invoicePrefix, 'autocomplete="off"')}
          <p class="field-hint">Next invoice: <b class="mono">${nextInvoiceNo()}</b></p>
          <label class="switch-row"><input type="checkbox" name="sstEnabled" ${settings.sstEnabled ? 'checked' : ''}>
            <span><b>Charge SST by default</b><span class="cell-sub">The counter can still switch it per bill.</span></span></label>
          ${text('sstRate', 'SST rate (%)', settings.sstRate, 'type="number" min="0" max="20" step="0.5"')}
          <button class="btn btn-primary" type="submit">${icon('check')} Save invoice settings</button>
        </form>

        <form class="card stack settings-wide" data-submit="whatsapp">
          <div class="card-head"><h2 class="sign-title">${icon('whatsapp', { size: 18 })} Invoice to WhatsApp</h2></div>
          <div class="field">
            <span class="field-label">Send the invoice to</span>
            <div class="radio-list">
              ${[
                ['choose', 'Let me pick the chat', 'WhatsApp opens and you choose the contact. Best for a demo.'],
                ['customer', "The customer's number", 'Opens straight in the chat with the number on the job.'],
                ['demo', 'A fixed demo number', 'Every invoice goes to one number, for example your own.'],
              ].map(([value, label, hint]) => html`
                <label class="radio-row"><input type="radio" name="waTarget" value="${value}" ${settings.waTarget === value ? 'checked' : ''}>
                  <span><b>${label}</b><span class="cell-sub">${hint}</span></span></label>`)}
            </div>
          </div>
          ${text('demoPhone', 'Demo number', settings.demoPhone, 'type="tel" placeholder="012-345 6789"')}
          <div class="field"><label for="set-waTemplate">Message</label>
            <textarea id="set-waTemplate" class="textarea" name="waTemplate" rows="6">${settings.waTemplate}</textarea>
            <span class="field-hint">Fills in: {name} {invoice} {plate} {total} {link} {shop}</span></div>
          ${sample ? html`<details class="paid-preview"><summary>Preview with ${sample.no} (${fmtRMTight(sample.total)})</summary><pre>${invoiceWaText(sample)}</pre></details>` : ''}
          <p class="paid-note">${icon('alert', { size: 14 })} One tap after payment. Fully automatic sending needs the WhatsApp Business API (phase 2).</p>
          <button class="btn btn-primary" type="submit">${icon('check')} Save WhatsApp settings</button>
        </form>

        <form class="card stack" data-submit="bays">
          <div class="card-head"><h2 class="sign-title">${icon('lift', { size: 18 })} Bays</h2></div>
          ${STATE.bays.map((b) => html`
            <div class="grid-2">
              ${text(`bay-name-${b.id}`, `Bay ${b.id} name`, b.name)}
              ${text(`bay-label-${b.id}`, 'Used for', b.label)}
            </div>`)}
          <button class="btn btn-primary" type="submit">${icon('check')} Save bays</button>
        </form>

        <section class="card stack">
          <div class="card-head"><h2 class="sign-title">${icon('qr', { size: 18 })} Counter check-in QR</h2></div>
          <div class="qr-row">
            <div class="qr">${qrSvg(absUrl('/checkin'), { label: 'Check-in QR code' })}</div>
            <p class="small muted">Print this on the counter stand. Customers scan it to check in without queueing; the link opens ${absUrl('/checkin')}.</p>
          </div>
          <a class="btn btn-outline" href="#/admin/checkin-stand">${icon('printer')} Open printable stand (A5)</a>
        </section>

        <section class="card stack danger-card">
          <div class="card-head"><h2 class="sign-title">${icon('refresh', { size: 18 })} Demo data</h2></div>
          <p class="muted small">Everything lives in this browser. Reset brings back the sample workshop with today's bookings, jobs and invoices; it also resets on its own each new day.</p>
          <button class="btn ${confirmReset ? 'btn-primary' : 'btn-outline'}" data-action="reset">${confirmReset ? 'Tap again to reset everything' : 'Reset demo data'}</button>
        </section>
      </div>`;
  },
  submits: {
    shop(form) {
      const d = Object.fromEntries(new FormData(form));
      if (!d.name.trim()) { toast('The workshop needs a name.'); return; }
      saveShop({ name: d.name.trim(), tagline: d.tagline.trim(), ssm: d.ssm.trim(), phone: d.phone.trim(), address: d.address.trim(), hoursOpen: d.hoursOpen, hoursClose: d.hoursClose });
      toast('Workshop saved');
      refresh({ force: true });
    },
    invoice(form) {
      const d = Object.fromEntries(new FormData(form));
      saveSettings({ invoicePrefix: d.invoicePrefix.trim() || 'INV-', sstEnabled: Boolean(d.sstEnabled), sstRate: Math.max(0, Number(d.sstRate) || 0) });
      toast('Invoice settings saved');
      refresh({ force: true });
    },
    whatsapp(form) {
      const d = Object.fromEntries(new FormData(form));
      if (d.waTarget === 'demo' && d.demoPhone.replace(/\D/g, '').length < 9) { toast('Enter the demo number first.'); return; }
      saveSettings({ waTarget: d.waTarget, demoPhone: d.demoPhone.trim(), waTemplate: d.waTemplate });
      toast('WhatsApp settings saved');
      refresh({ force: true });
    },
    bays(form) {
      const d = Object.fromEntries(new FormData(form));
      saveBays(STATE.bays.map((b) => ({ ...b, name: (d[`bay-name-${b.id}`] || b.name).trim(), label: (d[`bay-label-${b.id}`] || '').trim() })));
      toast('Bays saved');
      refresh({ force: true });
    },
  },
  actions: {
    reset() {
      if (!confirmReset) { confirmReset = true; refresh({ force: true }); return; }
      confirmReset = false;
      resetDemo();
      toast('Demo data reset');
      navigate('/admin');
    },
  },
});
