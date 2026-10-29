// #/invoice/:no — the invoice the customer receives on WhatsApp, laid out like the sample the
// client sent: the shop's mark and number, a QR back to this page, billed-to and vehicle, issued
// and paid stamps, items with a struck-through price where there was a discount, the payments,
// the totals, and a diagonal PAID band. It prints on one A4 page with the buttons hidden.

import { html, fmtRMTight, fmtStamp } from '../ui.js';
import { STATE, invoiceByNo } from '../state.js';
import { queryParam } from '../router.js';
import { qrSvg } from '../qr.js';
import { decode, expandInvoice, preferLive, invoiceLink, invoiceWaLink } from '../share.js';
import { publicHeader, publicFooter } from './public.js';
import { icon } from './icons.js';

const METHOD_SHORT = { duitnow: 'DuitNow', fpx: 'FPX', card: 'Card', cash: 'Cash' };

function itemRow(line) {
  const gross = line.qty * line.price;
  const net = gross - (line.discount || 0);
  return html`
    <div class="inv-item">
      <div>
        <b>${line.name}</b>
        <span>${line.qty}x @ ${fmtRMTight(line.price)}</span>
        ${line.discount ? html`<span>Discount: ${fmtRMTight(line.discount)}</span>` : ''}
      </div>
      <div class="inv-amount">
        ${line.discount ? html`<s>${fmtRMTight(gross)}</s>` : ''}
        <span>${fmtRMTight(net)}</span>
      </div>
    </div>`;
}

// The sheet on its own, so the admin's paid screen can show the same invoice.
export function invoiceSheet(inv) {
  const shop = STATE.shop;
  return html`
    <article class="invoice" aria-label="Invoice ${inv.no}">
      <header class="inv-head">
        <div class="inv-brand">
          <span class="inv-mark">OLD TOWN<small>WORKSHOP</small></span>
          <h1 class="inv-title">Invoice</h1>
          <p class="inv-no">${inv.no}</p>
        </div>
        <div class="inv-qr">
          <div class="qr">${qrSvg(invoiceLink(inv), { label: `QR code that opens invoice ${inv.no}` })}</div>
          <span>View Our Invoice</span>
        </div>
        <div class="inv-shop">
          <b>${shop.name.toUpperCase()}</b>
          <span>SSM ${shop.ssm}</span>
          <span>${shop.phone}</span>
          <span class="inv-address">${shop.address}</span>
        </div>
      </header>

      <section class="inv-meta">
        <dl>
          <div><dt>Billed to</dt><dd>${inv.name}</dd></div>
          <div><dt>Vehicle</dt><dd>${inv.plate}${inv.model ? html` <small>${inv.model}</small>` : ''}</dd></div>
        </dl>
        <dl class="inv-dates">
          <div><dt>Issued</dt><dd>${fmtStamp(inv.issuedAt)}</dd></div>
          <div><dt>Paid</dt><dd>${fmtStamp(inv.paidAt)}</dd></div>
        </dl>
      </section>

      <section class="inv-items">
        <p class="inv-label">Items:</p>
        ${inv.lines.map(itemRow)}
      </section>

      <section class="inv-foot">
        <div class="inv-payments">
          <b>Payment(s):</b>
          <ol>
            ${inv.payments.map((p) => html`<li>${METHOD_SHORT[p.method] || p.method}<span>${fmtRMTight(p.amount)} @ ${fmtStamp(p.at)}</span></li>`)}
          </ol>
        </div>
        <dl class="inv-totals">
          <div><dt>Subtotal:</dt><dd>${fmtRMTight(inv.subtotal)}</dd></div>
          ${inv.discount ? html`<div><dt>Discount:</dt><dd>-${fmtRMTight(inv.discount)}</dd></div>` : ''}
          <div><dt>Tax${inv.sstRate ? ` (SST ${inv.sstRate}%)` : ''}:</dt><dd>${fmtRMTight(inv.sst)}</dd></div>
          <div class="inv-total"><dt>Total</dt><dd>${fmtRMTight(inv.total)}</dd></div>
        </dl>
      </section>

      <p class="inv-page">Page 1 / 1</p>
      <div class="inv-stamp" aria-label="Paid"><span>PAID</span><small>${fmtStamp(inv.paidAt).slice(0, 10)}</small></div>
    </article>`;
}

export const invoicePage = {
  title: 'Invoice',
  surface: 'invoice',
  render({ no }) {
    const snap = expandInvoice(decode(queryParam('d')));
    const inv = preferLive(invoiceByNo(no) || null, snap && snap.no === no ? snap : null);
    if (!inv) {
      return html`${publicHeader()}<main class="container narrow flow"><div class="card empty">
        ${icon('alert', { size: 36 })}<h1 class="sign-title">This link has expired</h1>
        <p>We could not find invoice ${no}. Ask the workshop to send it again.</p>
        <a class="btn btn-primary" href="#/">Back to the workshop</a></div></main>${publicFooter()}`;
    }
    return html`
      ${publicHeader()}
      <main class="container inv-page-wrap">
        <div class="inv-actions">
          <button class="btn btn-primary" data-action="print">${icon('printer')} Print / Save PDF</button>
          <a class="btn btn-wa" href="${invoiceWaLink(inv)}" target="_blank" rel="noopener">${icon('whatsapp')} Send to WhatsApp</a>
          <a class="btn btn-ghost" href="#/">Back</a>
        </div>
        ${invoiceSheet(inv)}
      </main>
      ${publicFooter()}`;
  },
  actions: {
    print() { window.print(); },
  },
};
