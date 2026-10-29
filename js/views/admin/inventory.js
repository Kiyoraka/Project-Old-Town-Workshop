// #/admin/inventory — every part with its stock, reorder level, cost and price. Filter to the
// parts at or below their reorder level, search, add or edit a part, take stock in (or adjust a
// count), and open a part's movement log: deliveries in, parts used on which job, returns.

import { html, fmtRM, fmtStamp, round2, toast } from '../../ui.js';
import { STATE, partById, partMoves, lowStock, savePart, stockIn } from '../../state.js';
import { refresh, queryParam } from '../../router.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let filter = 'all';       // 'all' | 'low'
let seenHash = '';        // a link with ?filter=low sets the filter once per arrival
let query = '';
let modal = null;         // { type: 'part' | 'stock' | 'history', id, draft, errors }

const KIND_LABEL = { in: 'Stock in', used: 'Used', returned: 'Returned', adjust: 'Adjusted' };

function partRow(p) {
  const low = p.qty <= p.min;
  const text = `${p.sku} ${p.name} ${p.brand} ${p.fits}`.toLowerCase();
  const hidden = (filter === 'low' && !low) || (query && !text.includes(query));
  return html`
    <tr class="${low ? 'row-low' : ''}" data-search="${text}" data-low="${low}" ${hidden ? 'hidden' : ''}>
      <td data-label="SKU" class="sku">${p.sku}</td>
      <td data-label="Part" class="wide"><b>${p.name}</b> <span class="muted">${p.brand}</span><span class="cell-sub">${p.fits}</span></td>
      <td data-label="In stock" class="num"><b class="tabular">${p.qty}</b> ${low ? html`<span class="status status-low">Low</span>` : ''}</td>
      <td data-label="Reorder at" class="num">${p.min}</td>
      <td data-label="Cost" class="num">${fmtRM(p.cost)}</td>
      <td data-label="Price" class="num">${fmtRM(p.price)}</td>
      <td data-label="" class="cell-actions wide">
        <button class="btn btn-patina btn-sm" data-action="stock" data-id="${p.id}">${icon('plus', { size: 14 })} Stock in</button>
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p.id}">${icon('edit', { size: 14 })} Edit</button>
        <button class="btn btn-ghost btn-sm" data-action="history" data-id="${p.id}">${icon('history', { size: 14 })} Log</button>
      </td>
    </tr>`;
}

function field(name, label, { type = 'text', step = '', cls = '' } = {}) {
  const value = modal.draft[name] ?? '';
  return html`
    <div class="field">
      <label for="pm-${name}">${label}</label>
      <input id="pm-${name}" class="input ${cls}" type="${type}" ${step ? `step="${step}"` : ''} min="0" name="${name}" value="${value}" data-input="draft" aria-invalid="${modal.errors[name] ? 'true' : 'false'}">
      ${modal.errors[name] ? html`<span class="field-error">${modal.errors[name]}</span>` : ''}
    </div>`;
}

function partModal() {
  const editing = Boolean(modal.id);
  return html`
    <div class="modal-backdrop" data-action="close" data-self>
      <form class="modal" data-submit="save-part" novalidate role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <div class="modal-head"><h2 class="sign-title" id="pm-title">${editing ? 'Edit part' : 'New part'}</h2>
          <button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="grid-2">
            ${field('sku', 'SKU', { cls: 'mono' })}
            ${field('brand', 'Brand')}
          </div>
          ${field('name', 'Part name')}
          ${field('fits', 'Fits (models)')}
          <div class="grid-2">
            ${field('cost', 'Cost (RM)', { type: 'number', step: '0.01' })}
            ${field('price', 'Selling price (RM)', { type: 'number', step: '0.01' })}
            ${field('min', 'Reorder at (qty)', { type: 'number', step: '1' })}
            ${editing ? '' : field('qty', 'Opening stock', { type: 'number', step: '1' })}
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')} Save part</button>
        </div>
      </form>
    </div>`;
}

function stockModal() {
  const p = partById(modal.id);
  return html`
    <div class="modal-backdrop" data-action="close" data-self>
      <form class="modal" data-submit="save-stock" novalidate role="dialog" aria-modal="true" aria-labelledby="sm-title">
        <div class="modal-head"><h2 class="sign-title" id="sm-title">Stock in</h2>
          <button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <p><b>${p.name}</b> <span class="muted">${p.brand} · ${p.sku}</span><br><span class="muted">Now in stock: <b>${p.qty}</b> · reorder at ${p.min}</span></p>
          <div class="grid-2">
            ${field('qty', 'Quantity (use minus to adjust down)', { type: 'number', step: '1' })}
            ${field('note', 'Note')}
          </div>
          <div class="chips">
            ${[5, 10, 20].map((n) => html`<button type="button" class="chip" data-action="stock-quick" data-qty="${n}">+${n}</button>`)}
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')} Save</button>
        </div>
      </form>
    </div>`;
}

function historySheet() {
  const p = partById(modal.id);
  const moves = partMoves(p.id);
  return html`
    <div class="sheet-backdrop" data-action="close" data-self>
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="hs-title">
        <div class="modal-head"><h2 class="sign-title" id="hs-title">${p.name}</h2><span class="sku">${p.sku}</span><span class="spacer"></span>
          <button class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <p class="muted">${p.brand} · ${p.fits} · in stock <b>${p.qty}</b></p>
          ${moves.length ? html`
            <ul class="list">
              ${moves.map((m) => html`
                <li>
                  <span class="list-time mono">${fmtStamp(m.at).slice(5, 16)}</span>
                  <span class="list-main"><b>${KIND_LABEL[m.kind] || m.kind}</b><span class="cell-sub">${/^JOB-/.test(m.ref) ? html`<a href="#/admin/job/${m.ref}">${m.ref}</a>` : m.ref}</span></span>
                  <b class="mono move-qty ${m.qty < 0 ? 'is-out' : 'is-in'}">${m.qty > 0 ? '+' : ''}${m.qty}</b>
                </li>`)}
            </ul>` : html`<p class="empty">No movements yet.</p>`}
        </div>
      </section>
    </div>`;
}

export const inventoryPage = adminPage({
  active: 'inventory',
  title: 'Inventory',
  render() {
    if (location.hash !== seenHash) { seenHash = location.hash; filter = queryParam('filter') === 'low' ? 'low' : 'all'; }
    const low = lowStock().length;
    const value = round2(STATE.parts.reduce((s, p) => s + p.qty * p.cost, 0));
    return html`
      <section class="kpis">
        <div class="kpi is-patina"><div class="kpi-label">Parts</div><div class="kpi-value">${STATE.parts.length}</div><div class="kpi-sub">SKUs on the shelf</div></div>
        <div class="kpi is-brass"><div class="kpi-label">Stock value</div><div class="kpi-value tabular">${fmtRM(value)}</div><div class="kpi-sub">at cost</div></div>
        <div class="kpi ${low ? 'is-low' : 'is-patina'}"><div class="kpi-label">Low stock</div><div class="kpi-value">${low}</div><div class="kpi-sub">at or below reorder level</div></div>
        <div class="kpi"><div class="kpi-label">Used today</div><div class="kpi-value">${STATE.stockMoves.filter((m) => m.kind === 'used' && new Date(m.at).toDateString() === new Date().toDateString()).reduce((s, m) => s - m.qty, 0)}</div><div class="kpi-sub">pieces on jobs</div></div>
      </section>
      <section class="card">
        <div class="toolbar">
          <h2 class="sign-title">Parts</h2>
          <div class="chips" role="group" aria-label="Filter">
            <button class="chip" data-action="filter" data-filter="all" aria-pressed="${filter === 'all'}">All</button>
            <button class="chip" data-action="filter" data-filter="low" aria-pressed="${filter === 'low'}">Low <b>${low}</b></button>
          </div>
          <label class="toolbar-search">${icon('search', { size: 16 })}<input class="input" type="search" placeholder="SKU, part, brand, model" value="${query}" data-input="search" aria-label="Search parts"></label>
          <button class="btn btn-primary btn-sm" data-action="new-part">${icon('plus', { size: 16 })} Part</button>
        </div>
        <div class="table-wrap">
          <table class="data-table cards">
            <thead><tr><th>SKU</th><th>Part</th><th class="num">In stock</th><th class="num">Reorder at</th><th class="num">Cost</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>${STATE.parts.map(partRow)}</tbody>
          </table>
        </div>
      </section>
      ${modal?.type === 'part' ? partModal() : modal?.type === 'stock' ? stockModal() : modal?.type === 'history' ? historySheet() : ''}`;
  },
  inputs: {
    search(el) {
      query = el.value.trim().toLowerCase();
      document.querySelectorAll('.data-table tbody tr').forEach((tr) => {
        tr.hidden = (filter === 'low' && tr.dataset.low !== 'true') || (Boolean(query) && !tr.dataset.search.includes(query));
      });
    },
    draft(el) { modal.draft[el.name] = el.value; },
  },
  actions: {
    filter(el) { filter = el.dataset.filter; refresh({ force: true }); },
    'new-part'() { modal = { type: 'part', id: null, draft: { sku: '', name: '', brand: '', fits: '', cost: '', price: '', min: '2', qty: '0' }, errors: {} }; refresh({ force: true }); },
    edit(el) { modal = { type: 'part', id: el.dataset.id, draft: { ...partById(el.dataset.id) }, errors: {} }; refresh({ force: true }); },
    stock(el) { modal = { type: 'stock', id: el.dataset.id, draft: { qty: '', note: 'Supplier delivery' }, errors: {} }; refresh({ force: true }); },
    'stock-quick'(el) { modal.draft.qty = el.dataset.qty; refresh({ force: true }); },
    history(el) { modal = { type: 'history', id: el.dataset.id }; refresh({ force: true }); },
    close() { modal = null; refresh({ force: true }); },
  },
  submits: {
    'save-part'() {
      const d = modal.draft;
      const errors = {};
      if (!String(d.sku).trim()) errors.sku = 'Enter a SKU.';
      else if (STATE.parts.some((p) => p.sku === String(d.sku).trim().toUpperCase() && p.id !== modal.id)) errors.sku = 'That SKU is already used.';
      if (!String(d.name).trim()) errors.name = 'Enter the part name.';
      if (!(Number(d.price) > 0)) errors.price = 'Enter a selling price.';
      modal.errors = errors;
      if (Object.keys(errors).length) { refresh({ force: true }); return; }
      savePart({ ...d, id: modal.id, brand: d.brand || '', fits: d.fits || '' });
      toast(modal.id ? 'Part updated' : 'Part added');
      modal = null;
      refresh({ force: true });
    },
    'save-stock'() {
      const qty = Math.round(Number(modal.draft.qty) || 0);
      if (!qty) { modal.errors = { qty: 'Enter a quantity.' }; refresh({ force: true }); return; }
      if (partById(modal.id).qty + qty < 0) { modal.errors = { qty: 'That would take stock below zero.' }; refresh({ force: true }); return; }
      stockIn(modal.id, qty, modal.draft.note);
      toast(`${qty > 0 ? '+' : ''}${qty} ${partById(modal.id).name}`);
      modal = null;
      refresh({ force: true });
    },
  },
});
