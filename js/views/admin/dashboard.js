// #/admin — the owner's morning glance: today's takings, open jobs, bookings and low stock up top;
// the four bays as they are now; jobs per stage; today's bookings with a one-tap check-in; parts
// to reorder; the week's takings; and the latest invoices.

import { html, fmtRM, fmtSlot, fmtDay, fmtTime, dayStr, toast } from '../../ui.js';
import { STATE, todayStats, bayBoard, jobsByStatus, bookingsOn, lowStock, revenueByDay, serviceById, staffById, checkIn, todayInvoices } from '../../state.js';
import { JOB_STATUSES } from '../../data.js';
import { navigate } from '../../router.js';
import { plate, statusPill, bookingPill } from '../public.js';
import { icon } from '../icons.js';
import { adminPage } from './layout.js';

function kpis() {
  const s = todayStats();
  const ready = jobsByStatus('ready').length;
  const low = lowStock().length;
  return html`
    <section class="kpis">
      <div class="kpi"><div class="kpi-label">Today's takings</div><div class="kpi-value tabular">${fmtRM(s.revenue)}</div><div class="kpi-sub">${s.paidCount} invoices · avg ${fmtRM(s.avgTicket)}</div></div>
      <a class="kpi is-patina" href="#/admin/jobs"><div class="kpi-label">Open jobs</div><div class="kpi-value">${s.open}</div><div class="kpi-sub">${ready} ready to charge</div></a>
      <a class="kpi is-brass" href="#/admin/bookings"><div class="kpi-label">Bookings today</div><div class="kpi-value">${s.bookings}</div><div class="kpi-sub">${STATE.bookings.filter((b) => b.status === 'pending').length} waiting to confirm</div></a>
      <a class="kpi ${low ? 'is-low' : 'is-patina'}" href="#/admin/inventory?filter=low"><div class="kpi-label">Low stock</div><div class="kpi-value">${low}</div><div class="kpi-sub">${low ? 'parts at or below reorder level' : 'all parts above reorder level'}</div></a>
    </section>`;
}

function bays() {
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Bays now</h2><span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/admin/jobs">Job board</a></div>
      <div class="bay-board">
        ${bayBoard().map(({ bay, job }) => job ? html`
          <a class="bay-card is-busy" href="#/admin/job/${job.id}">
            <span class="bay-name">${icon('lift', { size: 16 })} ${bay.name}<small>${bay.label}</small></span>
            ${plate(job.plate)}
            <span class="bay-what">${job.lines.find((l) => l.kind === 'service')?.name || 'Inspection'}</span>
            <span class="bay-who">${staffById(job.mechanicId)?.name || 'Unassigned'} · ${statusPill(job.status)}</span>
          </a>` : html`
          <div class="bay-card">
            <span class="bay-name">${icon('lift', { size: 16 })} ${bay.name}<small>${bay.label}</small></span>
            <span class="bay-free">Free</span>
          </div>`)}
      </div>
    </section>`;
}

function stages() {
  const counts = JOB_STATUSES.map((s) => ({ ...s, count: jobsByStatus(s.id).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Jobs by stage</h2></div>
      <ul class="stage-bars">
        ${counts.map((c) => html`
          <li><a href="#/admin/jobs">${statusPill(c.id)}<span class="stage-track"><span class="stage-fill stage-${c.id}" style="width:${(c.count / max) * 100}%"></span></span><b class="tabular">${c.count}</b></a></li>`)}
      </ul>
      <p class="muted small">Paid counts today only.</p>
    </section>`;
}

function todaysBookings() {
  const list = bookingsOn(dayStr()).filter((b) => b.status !== 'cancelled');
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Today's bookings</h2><span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/admin/bookings">All bookings</a></div>
      ${list.length ? html`
        <ul class="list">
          ${list.map((b) => html`
            <li>
              <span class="list-time mono">${fmtSlot(b.time)}</span>
              <span class="list-main">${plate(b.plate)} <b>${serviceById(b.serviceId)?.name}</b><span class="cell-sub">${b.name} · ${b.model}</span></span>
              ${b.status === 'checked-in'
                ? html`<a class="btn btn-ghost btn-sm" href="#/admin/job/${b.jobId}">${b.jobId}</a>`
                : html`<button class="btn btn-patina btn-sm" data-action="check-in" data-id="${b.id}">Check in</button>`}
              ${bookingPill(b.status)}
            </li>`)}
        </ul>` : html`<p class="empty">No bookings today.</p>`}
    </section>`;
}

function reorder() {
  const parts = lowStock();
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Reorder soon</h2><span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/admin/inventory?filter=low">Inventory</a></div>
      ${parts.length ? html`
        <ul class="list">
          ${parts.map((p) => html`
            <li>
              <span class="list-main"><b>${p.name}</b><span class="cell-sub">${p.brand} · ${p.fits}</span></span>
              <span class="status status-low">${p.qty} left · min ${p.min}</span>
            </li>`)}
        </ul>` : html`<p class="empty">Everything is above its reorder level.</p>`}
    </section>`;
}

function week() {
  const days = revenueByDay(7);
  const max = Math.max(1, ...days.map((d) => d.total));
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Takings, last 7 days</h2><span class="spacer"></span><b class="tabular">${fmtRM(days.reduce((s, d) => s + d.total, 0))}</b></div>
      <div class="rev-bars" role="img" aria-label="Takings for the last seven days">
        ${days.map((d) => html`
          <div class="rev-col ${d.day === dayStr() ? 'is-today' : ''}">
            <span class="rev-amount tabular">${d.total ? Math.round(d.total) : ''}</span>
            <span class="rev-bar" style="height:${Math.max(3, (d.total / max) * 100)}%"></span>
            <span class="rev-day">${d.day === dayStr() ? 'Today' : fmtDay(d.day).split(' ')[0]}</span>
          </div>`)}
      </div>
    </section>`;
}

function latestInvoices() {
  const list = [...todayInvoices()].reverse().slice(0, 5);
  return html`
    <section class="card">
      <div class="card-head"><h2 class="sign-title">Paid today</h2></div>
      ${list.length ? html`
        <ul class="list">
          ${list.map((i) => html`
            <li>
              <span class="list-time mono">${fmtTime(i.paidAt)}</span>
              <span class="list-main"><a href="#/invoice/${i.no}" class="mono">${i.no}</a><span class="cell-sub">${i.name} · ${i.plate}</span></span>
              <b class="tabular">${fmtRM(i.total)}</b>
            </li>`)}
        </ul>` : html`<p class="empty">Nothing paid yet today.</p>`}
    </section>`;
}

export const dashboardPage = adminPage({
  active: 'dashboard',
  title: 'Dashboard',
  render() {
    return html`
      ${kpis()}
      <div class="dash-row">${bays()}${stages()}</div>
      <div class="dash-row">${todaysBookings()}${reorder()}</div>
      <div class="dash-row">${week()}${latestInvoices()}</div>`;
  },
  actions: {
    'check-in'(el) {
      const result = checkIn({ bookingId: el.dataset.id });
      toast(`${result.job.plate} checked in as ${result.job.id}`);
      navigate(`/admin/job/${result.job.id}`);
    },
  },
});
