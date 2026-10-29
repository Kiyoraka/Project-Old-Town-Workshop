// The payment gateway sheet, in demo mode: no money moves and no card details are asked for.
// DuitNow shows a QR and "receives" the payment a few seconds later (or at once with the button);
// FPX picks a bank and approves; Card waits for the terminal; Cash takes the amount given and
// works out the change. Every path ends in pay(), which issues the next invoice, then the paid
// screen.

import { html, fmtRM, round2, toast } from '../../ui.js';
import { pay } from '../../state.js';
import { PAYMENT_METHODS } from '../../data.js';
import { refresh, navigate } from '../../router.js';
import { qrSvg } from '../../qr.js';
import { icon } from '../icons.js';

const BANKS = ['Bank A', 'Bank B', 'Bank C', 'Bank D', 'Bank E', 'Bank F'];
const METHOD_ICON = { duitnow: 'qr', fpx: 'bank', card: 'card', cash: 'cash' };

let open = false;
let method = 'duitnow';
let phase = 'choose';      // 'choose' | 'processing'
let bank = '';
let cashGiven = '';
let timer = null;

export const isGatewayOpen = () => open;

export function openGateway() {
  open = true;
  method = 'duitnow';
  phase = 'choose';
  bank = '';
  cashGiven = '';
}

function close() {
  clearTimeout(timer);
  open = false;
  refresh({ force: true });
}

// What the sheet is paying for is read back from the checkout page when it fires.
let pending = null;      // { job, sums, draft }

function complete(extra = {}) {
  clearTimeout(timer);
  phase = 'processing';
  refresh({ force: true });
  timer = setTimeout(() => {
    const { job, draft } = pending;
    const result = pay(job.id, { ...draft, method, ...extra });
    open = false;
    if (!result.ok) { toast('Payment could not be recorded.'); refresh({ force: true }); return; }
    navigate(`/admin/paid/${result.invoice.no}`);
  }, 1200);
}

function duitnowPane(job, sums) {
  return html`
    <div class="gw-pane gw-duitnow">
      <div class="qr gw-qr">${qrSvg(`DUITNOW-DEMO|${job.id}|${sums.total.toFixed(2)}`, { label: 'Demo DuitNow QR code' })}</div>
      <p><b>Customer scans with any banking or e-wallet app.</b></p>
      <p class="gw-wait">${icon('refresh', { size: 16 })} Waiting for payment…</p>
      <button class="btn btn-outline btn-sm" data-action="gw-paid">Customer has paid</button>
    </div>`;
}

function fpxPane() {
  return html`
    <div class="gw-pane">
      <p class="field-label">Choose the customer's bank</p>
      <div class="gw-banks">
        ${BANKS.map((b) => html`<button class="chip" data-action="gw-bank" data-bank="${b}" aria-pressed="${bank === b}">${icon('bank', { size: 16 })} ${b}</button>`)}
      </div>
      <button class="btn btn-primary btn-block" data-action="gw-approve" ${bank ? '' : 'disabled'}>${icon('shield')} Approve on ${bank || 'the bank page'}</button>
    </div>`;
}

function cardPane(sums) {
  return html`
    <div class="gw-pane gw-card">
      <div class="gw-terminal">
        <span class="gw-terminal-screen">${fmtRM(sums.total)}<small>TAP · INSERT · SWIPE</small></span>
      </div>
      <p class="muted small">Hand the terminal to the customer. No card details are typed here.</p>
      <button class="btn btn-primary btn-block" data-action="gw-approve">${icon('check')} Approved on the terminal</button>
    </div>`;
}

function cashPane(sums) {
  const given = Number(cashGiven) || 0;
  const change = round2(given - sums.total);
  const quick = [sums.total, 50, 100, 200, 500].filter((v, i) => i === 0 || v > sums.total);
  return html`
    <form class="gw-pane" data-submit="gw-cash" novalidate>
      <div class="field">
        <label for="gw-cash">Cash received</label>
        <input id="gw-cash" class="input input-plate" type="number" min="0" step="0.01" inputmode="decimal" value="${cashGiven}" data-input="gw-cash">
      </div>
      <div class="chips">
        ${quick.map((v, i) => html`<button type="button" class="chip" data-action="gw-quick" data-value="${v}">${i === 0 ? 'Exact' : fmtRM(v)}</button>`)}
      </div>
      <p class="gw-change" id="gw-change">${given >= sums.total ? html`Change: <b>${fmtRM(change)}</b>` : html`<span class="muted">Enter at least ${fmtRM(sums.total)}</span>`}</p>
      <button class="btn btn-primary btn-block" type="submit">${icon('cash')} Record cash payment</button>
    </form>`;
}

export function gatewaySheet(job, sums) {
  pending = { job, sums, draft: pendingDraft() };
  if (open && method === 'duitnow' && phase === 'choose') {
    clearTimeout(timer);
    timer = setTimeout(() => { if (open && method === 'duitnow' && phase === 'choose') complete(); }, 4000);
  }
  return html`
    <div class="sheet-backdrop" data-action="gw-close" data-self>
      <section class="sheet gateway" role="dialog" aria-modal="true" aria-labelledby="gw-title">
        <div class="modal-head">
          <div><h2 class="sign-title" id="gw-title">Payment gateway</h2><span class="badge-brass">DEMO · no money moves</span></div>
          <button class="icon-btn" data-action="gw-close" aria-label="Close" ${phase === 'processing' ? 'disabled' : ''}>${icon('close')}</button>
        </div>
        <div class="modal-body">
          <div class="gw-amount"><span class="kpi-label">${job.id} · ${job.plate}</span><b class="tabular">${fmtRM(sums.total)}</b></div>
          ${phase === 'processing' ? html`
            <div class="gw-processing" role="status"><span class="gw-spinner"></span><b>Processing ${PAYMENT_METHODS.find((m) => m.id === method)?.label}…</b></div>` : html`
            <div class="gw-tabs" role="tablist">
              ${PAYMENT_METHODS.map((m) => html`
                <button class="gw-tab" role="tab" data-action="gw-method" data-method="${m.id}" aria-selected="${method === m.id}">${icon(METHOD_ICON[m.id], { size: 18 })}<span>${m.label}</span></button>`)}
            </div>
            ${method === 'duitnow' ? duitnowPane(job, sums) : method === 'fpx' ? fpxPane() : method === 'card' ? cardPane(sums) : cashPane(sums)}`}
        </div>
      </section>
    </div>`;
}

// The checkout page hands over its draft through this hook (set by checkout.js).
let pendingDraft = () => ({});
export function useDraft(fn) { pendingDraft = fn; }

export const gatewayHandlers = {
  actions: {
    'gw-close'() { if (phase !== 'processing') close(); },
    'gw-method'(el) { clearTimeout(timer); method = el.dataset.method; refresh({ force: true }); },
    'gw-paid'() { complete(); },
    'gw-bank'(el) { bank = el.dataset.bank; refresh({ force: true }); },
    'gw-approve'() { complete(); },
    'gw-quick'(el) { cashGiven = String(el.dataset.value); refresh({ force: true }); },
  },
  inputs: {
    'gw-cash'(el) {
      cashGiven = el.value;
      const total = pending.sums.total;
      const given = Number(cashGiven) || 0;
      document.getElementById('gw-change').innerHTML = given >= total
        ? `Change: <b>${fmtRM(round2(given - total))}</b>`
        : `<span class="muted">Enter at least ${fmtRM(total)}</span>`;
    },
  },
  submits: {
    'gw-cash'() {
      const given = Number(cashGiven) || 0;
      if (given < pending.sums.total) { toast(`Cash received is less than ${fmtRM(pending.sums.total)}`); return; }
      complete({ cashGiven: given });
    },
  },
};
