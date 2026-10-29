// #/admin/staff — the people in the workshop: role, phone, jobs today, and whether they are on
// today (an off mechanic drops out of the job card's mechanic list). Add or edit a person; the
// roles card shows what each role can do.

import { html, toast, pluralize } from '../../ui.js';
import { STATE, staffById, jobsTodayFor, saveStaff, toggleStaffActive } from '../../state.js';
import { ROLES } from '../../data.js';
import { refresh } from '../../router.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

let modal = null;    // { id, draft, errors }

const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

function staffModal() {
  const d = modal.draft;
  const err = modal.errors;
  return html`
    <div class="modal-backdrop" data-action="close" data-self>
      <form class="modal" data-submit="save" novalidate role="dialog" aria-modal="true" aria-labelledby="st-title">
        <div class="modal-head"><h2 class="sign-title" id="st-title">${modal.id ? 'Edit staff' : 'New staff'}</h2>
          <button type="button" class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="field"><label for="st-name">Name</label>
            <input id="st-name" class="input" name="name" value="${d.name}" data-input="draft" aria-invalid="${err.name ? 'true' : 'false'}">
            ${err.name ? html`<span class="field-error">${err.name}</span>` : ''}</div>
          <div class="grid-2">
            <div class="field"><label for="st-role">Role</label>
              <select id="st-role" class="select" name="role" data-input="draft">
                ${ROLES.map((r) => html`<option value="${r.id}" ${d.role === r.id ? 'selected' : ''}>${r.label}</option>`)}
              </select></div>
            <div class="field"><label for="st-phone">Phone</label>
              <input id="st-phone" class="input" type="tel" name="phone" value="${d.phone}" data-input="draft"></div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn-primary">${icon('check')} Save</button>
        </div>
      </form>
    </div>`;
}

export const staffPage = adminPage({
  active: 'staff',
  title: 'Staff',
  render() {
    const on = STATE.staff.filter((s) => s.active).length;
    return html`
      <section class="card">
        <div class="toolbar">
          <h2 class="sign-title">Staff</h2>
          <span class="muted small">${on} of ${STATE.staff.length} on today</span>
          <button class="btn btn-primary btn-sm" data-action="new">${icon('plus', { size: 16 })} Staff</button>
        </div>
        <div class="table-wrap">
          <table class="data-table cards">
            <thead><tr><th>Name</th><th>Role</th><th class="num">Jobs today</th><th>Phone</th><th>Today</th><th></th></tr></thead>
            <tbody>
              ${STATE.staff.map((s) => html`
                <tr>
                  <td data-label="Name" class="wide"><span class="staff-name"><span class="avatar">${s.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span><b>${s.name}</b><span class="cell-sub">since ${s.since}</span></span></span></td>
                  <td data-label="Role">${roleLabel(s.role)}</td>
                  <td data-label="Jobs today" class="num tabular">${s.role === 'mechanic' ? jobsTodayFor(s.id) : '—'}</td>
                  <td data-label="Phone" class="mono">${s.phone}</td>
                  <td data-label="Today">
                    <label class="switch-row switch-inline">
                      <input type="checkbox" data-input="active" data-id="${s.id}" ${s.active ? 'checked' : ''} aria-label="${s.name} on today">
                      <span class="status ${s.active ? 'status-ready' : 'status-cancelled'}">${s.active ? 'On' : 'Off'}</span>
                    </label>
                  </td>
                  <td data-label="" class="cell-actions"><button class="btn btn-ghost btn-sm" data-action="edit" data-id="${s.id}">${icon('edit', { size: 14 })} Edit</button></td>
                </tr>`)}
            </tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h2 class="sign-title">${icon('shield', { size: 18 })} Roles</h2><span class="spacer"></span><span class="muted small">what each role can do</span></div>
        <div class="roles">
          ${ROLES.map((r) => html`
            <div class="role">
              <b>${r.label}</b>
              <ul>${r.can.map((c) => html`<li>${icon('check', { size: 14 })} ${c}</li>`)}</ul>
              <span class="muted small">${pluralize(STATE.staff.filter((s) => s.role === r.id).length, 'person', 'people')}</span>
            </div>`)}
        </div>
      </section>
      ${modal ? staffModal() : ''}`;
  },
  inputs: {
    active(el, event) {
      if (event.type !== 'change') return;     // a checkbox fires input and change: act once
      toggleStaffActive(el.dataset.id);
      el.blur();
      toast(`${staffById(el.dataset.id).name} is ${staffById(el.dataset.id).active ? 'on' : 'off'} today`);
      refresh({ force: true });
    },
    draft(el) { modal.draft[el.name] = el.value; },
  },
  actions: {
    new() { modal = { id: null, draft: { name: '', role: 'mechanic', phone: '' }, errors: {} }; refresh({ force: true }); },
    edit(el) { const s = staffById(el.dataset.id); modal = { id: s.id, draft: { name: s.name, role: s.role, phone: s.phone }, errors: {} }; refresh({ force: true }); },
    close() { modal = null; refresh({ force: true }); },
  },
  submits: {
    save() {
      if (!modal.draft.name.trim()) { modal.errors = { name: 'Enter a name.' }; refresh({ force: true }); return; }
      saveStaff({ ...modal.draft, id: modal.id });
      toast(modal.id ? 'Staff updated' : 'Staff added');
      modal = null;
      refresh({ force: true });
    },
  },
});
