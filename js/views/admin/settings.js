// #/admin/settings — the workshop's own details (they print on every invoice), invoice numbering
// and SST, where the WhatsApp invoice goes and what it says, the bays, the counter's check-in QR
// stand, installing as an app, and Reset demo data (a second tap confirms; never a browser
// dialog). One tab at a time, so each part fits a phone screen.

import { html, raw, fmtRMTight, toast } from '../../ui.js';
import { STATE, saveShop, saveSettings, saveBays, nextInvoiceNo, resetDemo } from '../../state.js';
import { refresh, navigate } from '../../router.js';
import { qrSvg } from '../../qr.js';
import { absUrl, invoiceWaText } from '../../share.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';
import { installState } from '../../pwa.js';

let confirmReset = false;
let tab = 'workshop';

const TABS = [
  { id: 'workshop', label: 'Workshop', icon: 'wrench' },
  { id: 'invoice', label: 'Invoice & tax', icon: 'receipt' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'bays', label: 'Bays', icon: 'lift' },
  { id: 'qr', label: 'Counter QR', icon: 'qr' },
  { id: 'app', label: 'App', icon: 'download' },
  { id: 'demo', label: 'Demo data', icon: 'refresh' },
];

// The tab a card belongs to: only the open tab's card is shown.
const pane = (id) => raw(`data-pane="${id}" role="tabpanel" aria-labelledby="set-tab-${id}" ${tab === id ? '' : 'hidden'}`);

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
      <div class="settings-tabs" role="tablist" aria-label="Settings">
        ${TABS.map((t) => html`
          <button class="settings-tab" role="tab" id="set-tab-${t.id}" data-action="tab" data-tab="${t.id}" aria-selected="${tab === t.id}">
            ${icon(t.icon, { size: 16 })}<span>${t.label}</span>
          </button>`)}
      </div>
      <div class="settings-panes">
        <form class="card stack" data-submit="shop" ${pane('workshop')}>
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

        <form class="card stack" data-submit="invoice" ${pane('invoice')}>
          <div class="card-head"><h2 class="sign-title">${icon('receipt', { size: 18 })} Invoice and tax</h2></div>
          ${text('invoicePrefix', 'Invoice number prefix', settings.invoicePrefix, 'autocomplete="off"')}
          <p class="field-hint">Next invoice: <b class="mono">${nextInvoiceNo()}</b></p>
          <label class="switch-row"><input type="checkbox" name="sstEnabled" ${settings.sstEnabled ? 'checked' : ''}>
            <span><b>Charge SST by default</b><span class="cell-sub">The counter can still switch it per bill.</span></span></label>
          ${text('sstRate', 'SST rate (%)', settings.sstRate, 'type="number" min="0" max="20" step="0.5"')}
          <button class="btn btn-primary" type="submit">${icon('check')} Save invoice settings</button>
        </form>

        <form class="card stack" data-submit="whatsapp" ${pane('whatsapp')}>
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

        <form class="card stack" data-submit="bays" ${pane('bays')}>
          <div class="card-head"><h2 class="sign-title">${icon('lift', { size: 18 })} Bays</h2></div>
          ${STATE.bays.map((b) => html`
            <div class="grid-2">
              ${text(`bay-name-${b.id}`, `Bay ${b.id} name`, b.name)}
              ${text(`bay-label-${b.id}`, 'Used for', b.label)}
            </div>`)}
          <button class="btn btn-primary" type="submit">${icon('check')} Save bays</button>
        </form>

        <section class="card stack" ${pane('qr')}>
          <div class="card-head"><h2 class="sign-title">${icon('qr', { size: 18 })} Counter check-in QR</h2></div>
          <div class="qr-row">
            <div class="qr">${qrSvg(absUrl('/checkin'), { label: 'Check-in QR code' })}</div>
            <p class="small muted">Print this on the counter stand. Customers scan it to check in without queueing; the link opens ${absUrl('/checkin')}.</p>
          </div>
          <a class="btn btn-outline" href="#/admin/checkin-stand">${icon('printer')} Open printable stand (A5)</a>
        </section>

        <section class="card stack" ${pane('app')}>
          <div class="card-head"><h2 class="sign-title">${icon('download', { size: 18 })} Install as an app</h2></div>
          <p class="muted small">On a phone the workshop opens full screen from its own icon, with the tab bar at the bottom, and keeps working without signal.</p>
          ${{
            installed: html`<p class="status status-ready">Running as an installed app</p>`,
            prompt: html`<button class="btn btn-patina" data-action="install">${icon('download')} Install the app</button>`,
            ios: html`<p class="small">On iPhone: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>`,
            none: html`<p class="small">Open this page in Chrome on Android (menu › Install app) or Safari on iPhone (Share › Add to Home Screen). The browser offers it once the site is on its live address.</p>`,
          }[installState()]}
        </section>

        <section class="card stack danger-card" ${pane('demo')}>
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
    tab(el) {
      tab = el.dataset.tab;
      confirmReset = false;
      refresh({ force: true });
    },
    reset() {
      if (!confirmReset) { confirmReset = true; refresh({ force: true }); return; }
      confirmReset = false;
      resetDemo();
      toast('Demo data reset');
      navigate('/admin');
    },
  },
});
