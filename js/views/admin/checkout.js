// #/admin/checkout/:id — the counter: every line on the job, a bill discount in RM or %, SST on
// or off (rate from Settings), the total, and Take payment, which opens the payment gateway
// sheet. The totals follow the discount as it is typed, without repainting the page.

import { html, fmtRM } from '../../ui.js';
import { STATE, jobById, lineNet, totals } from '../../state.js';
import { refresh, navigate } from '../../router.js';
import { plate } from '../public.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';
import { gatewaySheet, gatewayHandlers, openGateway, isGatewayOpen, useDraft } from './gateway.js';

let draft = null;          // { jobId, discountType, discountValue, sstEnabled }

useDraft(() => ({ discountType: draft.discountType, discountValue: draft.discountValue, sstEnabled: draft.sstEnabled }));

function ensureDraft(job) {
  if (!draft || draft.jobId !== job.id) {
    draft = { jobId: job.id, discountType: 'rm', discountValue: '', sstEnabled: STATE.settings.sstEnabled };
  }
  return draft;
}

export const currentSums = (job) => totals(job.lines, { ...draft, sstRate: STATE.settings.sstRate });
export const checkoutDraft = () => draft;

function totalsHtml(job) {
  const sum = currentSums(job);
  return html`
    <dl class="co-totals">
      <div><dt>Subtotal</dt><dd class="tabular">${fmtRM(sum.subtotal)}</dd></div>
      ${sum.discount ? html`<div><dt>Discount</dt><dd class="tabular">− ${fmtRM(sum.discount)}</dd></div>` : ''}
      <div><dt>SST ${sum.sstRate ? `${sum.sstRate}%` : '(off)'}</dt><dd class="tabular">${fmtRM(sum.sst)}</dd></div>
      <div class="co-total"><dt>Total</dt><dd class="tabular">${fmtRM(sum.total)}</dd></div>
    </dl>`;
}

function updateTotals(job) {
  const box = document.getElementById('co-totals');
  if (box) box.innerHTML = totalsHtml(job).toString();
  const pay = document.getElementById('co-pay-amount');
  if (pay) pay.textContent = fmtRM(currentSums(job).total);
}

const jobIdFromHash = () => location.hash.split('/').pop();

export const checkoutPage = adminPage({
  active: 'jobs',
  title: 'Checkout',
  render({ id }) {
    const job = jobById(id);
    if (!job) return html`<section class="card empty"><p>Job ${id} was not found.</p><a class="btn btn-primary" href="#/admin/jobs">Job board</a></section>`;
    if (job.status === 'paid') {
      navigate(`/admin/paid/${job.invoiceNo}`);
      return html``;
    }
    const d = ensureDraft(job);
    return html`
      <a class="back-link" href="#/admin/job/${job.id}">${icon('back', { size: 16 })} Back to ${job.id}</a>
      <div class="co-grid">
        <section class="card">
          <div class="card-head">
            <h2 class="sign-title">${icon('receipt', { size: 18 })} Bill</h2><span class="spacer"></span>
            <span class="mono">${job.id}</span> ${plate(job.plate)}
          </div>
          <p class="muted small">${job.name} · ${job.model} · ${job.phone}</p>
          <ul class="lines">
            ${job.lines.map((l) => html`
              <li class="line">
                <span class="line-name">${l.name}<span class="cell-sub">${l.qty} × ${fmtRM(l.price)}${l.discount ? ` · less ${fmtRM(l.discount)}` : ''}</span></span>
                <b class="line-total tabular">${fmtRM(lineNet(l))}</b>
              </li>`)}
          </ul>
        </section>

        <section class="card co-side">
          <div class="field">
            <span class="field-label">Discount</span>
            <div class="co-discount">
              <div class="chips" role="group" aria-label="Discount type">
                <button class="chip" data-action="discount-type" data-type="rm" aria-pressed="${d.discountType === 'rm'}">RM</button>
                <button class="chip" data-action="discount-type" data-type="pct" aria-pressed="${d.discountType === 'pct'}">%</button>
              </div>
              <input class="input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0" value="${d.discountValue}" data-input="discount" aria-label="Discount amount">
            </div>
          </div>
          <label class="switch-row">
            <input type="checkbox" data-input="sst" ${d.sstEnabled ? 'checked' : ''}>
            <span><b>Charge SST ${STATE.settings.sstRate}%</b><span class="cell-sub">Service tax, set in Settings</span></span>
          </label>
          <div id="co-totals">${totalsHtml(job)}</div>
          <button class="btn btn-primary btn-lg btn-block" data-action="take-payment" ${job.lines.length ? '' : 'disabled'}>
            ${icon('cash')} Take payment · <span id="co-pay-amount">${fmtRM(currentSums(job).total)}</span>
          </button>
          <p class="muted small">Payment gateway in demo mode: no money moves.</p>
        </section>
      </div>
      ${isGatewayOpen() ? gatewaySheet(job, currentSums(job)) : ''}`;
  },
  inputs: {
    discount(el) {
      draft.discountValue = el.value;
      updateTotals(jobById(jobIdFromHash()));
    },
    sst(el) {
      draft.sstEnabled = el.checked;
      updateTotals(jobById(jobIdFromHash()));
    },
    ...gatewayHandlers.inputs,
  },
  actions: {
    'discount-type'(el) {
      draft.discountType = el.dataset.type;
      refresh({ force: true });
    },
    'take-payment'() {
      openGateway();
      refresh({ force: true });
    },
    ...gatewayHandlers.actions,
  },
  submits: { ...gatewayHandlers.submits },
});
