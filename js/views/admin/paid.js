// #/admin/paid/:no — right after payment: a big PAID with the amount and method, and the one tap
// the client asked for, Send to WhatsApp, opening WhatsApp with the invoice message and link
// already typed (to the customer, a demo number, or a chat you pick, per Settings). The invoice
// itself sits below and is all that prints. Sending with no tap at all would need the WhatsApp
// Business API, which the page says plainly.

import { html, fmtRM } from '../../ui.js';
import { STATE, invoiceByNo } from '../../state.js';
import { PAYMENT_METHODS } from '../../data.js';
import { invoiceWaLink, invoiceWaText, invoiceWaTarget } from '../../share.js';
import { icon } from '../icons.js';
import { invoiceSheet } from '../invoice.js';
import { adminPage } from './layout.js';

function targetLine(inv) {
  const { waTarget } = STATE.settings;
  if (waTarget === 'customer') return `To ${inv.name} (${inv.phone})`;
  if (waTarget === 'demo') return invoiceWaTarget(inv) ? `To the demo number ${invoiceWaTarget(inv)}` : 'Demo number not set: you will pick the chat';
  return 'You pick the chat in WhatsApp';
}

export const paidPage = adminPage({
  active: 'jobs',
  title: 'Paid',
  render({ no }) {
    const inv = invoiceByNo(no);
    if (!inv) return html`<section class="card empty"><p>Invoice ${no} was not found.</p><a class="btn btn-primary" href="#/admin/jobs">Job board</a></section>`;
    const payment = inv.payments[0];
    const change = payment.cashGiven ? payment.cashGiven - payment.amount : 0;
    return html`
      <section class="card paid-card no-print">
        <div class="paid-mark">${icon('check')}</div>
        <p class="eyebrow">Paid · ${PAYMENT_METHODS.find((m) => m.id === payment.method)?.label}</p>
        <p class="paid-amount tabular">${fmtRM(inv.total)}</p>
        <p class="muted"><span class="mono">${inv.no}</span> · ${inv.name} · ${inv.plate}${change > 0 ? html` · change <b>${fmtRM(change)}</b>` : ''}</p>
        <a class="btn btn-wa btn-lg paid-wa" href="${invoiceWaLink(inv)}" target="_blank" rel="noopener">${icon('whatsapp', { size: 22 })} Send to WhatsApp</a>
        <p class="small muted">${targetLine(inv)} · <a href="#/admin/settings">change</a></p>
        <details class="paid-preview">
          <summary>Message preview</summary>
          <pre>${invoiceWaText(inv)}</pre>
        </details>
        <div class="row paid-actions">
          <a class="btn btn-outline" href="#/invoice/${inv.no}" target="_blank" rel="noopener">${icon('receipt')} View invoice</a>
          <button class="btn btn-outline" data-action="print">${icon('printer')} Print</button>
          <a class="btn btn-ghost" href="#/admin/jobs">Back to jobs</a>
        </div>
        <p class="paid-note">${icon('alert', { size: 14 })} One tap opens WhatsApp with everything typed. Sending with no tap at all needs the WhatsApp Business API (phase 2, paid per message).</p>
      </section>
      <div class="paid-sheet">${invoiceSheet(inv)}</div>`;
  },
  actions: {
    print() { window.print(); },
  },
});
