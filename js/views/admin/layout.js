// The admin shell, app style: a patina top bar (signboard, page title, signed-in email, Sign out)
// and a bottom navigation dock — floating and centred from 768 px, a full-width tab bar below.
// There is no sidebar anywhere. Badges count what needs a hand: open jobs, pending bookings,
// parts at or below their reorder level.

import { html } from '../../ui.js';
import { STATE, openJobs, lowStock } from '../../state.js';
import { signedInEmail, logout } from '../../auth.js';
import { navigate } from '../../router.js';
import { icon } from '../icons.js';
import { requireAdmin } from '../login.js';

const DOCK = [
  { id: 'dashboard', href: '#/admin', label: 'Dashboard', short: 'Home', icon: 'dashboard' },
  { id: 'jobs', href: '#/admin/jobs', label: 'Jobs', short: 'Jobs', icon: 'wrench' },
  { id: 'bookings', href: '#/admin/bookings', label: 'Bookings', short: 'Book', icon: 'calendar' },
  { id: 'inventory', href: '#/admin/inventory', label: 'Inventory', short: 'Stock', icon: 'box' },
  { id: 'staff', href: '#/admin/staff', label: 'Staff', short: 'Staff', icon: 'users' },
  { id: 'settings', href: '#/admin/settings', label: 'Settings', short: 'Settings', icon: 'settings' },
];

function badgeFor(id) {
  if (id === 'jobs') return openJobs().length;
  if (id === 'bookings') return STATE.bookings.filter((b) => b.status === 'pending').length;
  if (id === 'inventory') return lowStock().length;
  return 0;
}

function dock(active) {
  return html`
    <nav class="dock" aria-label="Admin">
      ${DOCK.map((item) => {
        const count = badgeFor(item.id);
        return html`
          <a class="dock-item ${active === item.id ? 'is-active' : ''}" href="${item.href}"
             aria-current="${active === item.id ? 'page' : 'false'}">
            <span class="dock-icon">${icon(item.icon, { size: 22 })}
              ${count ? html`<span class="dock-badge tabular ${item.id === 'inventory' ? 'is-warn' : ''}">${count}</span>` : ''}
            </span>
            <span class="dock-label"><span class="dock-long">${item.label}</span><span class="dock-short">${item.short}</span></span>
          </a>`;
      })}
    </nav>`;
}

export function adminLayout({ active, title, body }) {
  return html`
    <div class="admin">
      <header class="admin-top">
        <div class="admin-top-inner">
          <a class="signboard-name admin-brand" href="#/" title="Open the customer side">${STATE.shop.name}</a>
          <h1 class="admin-title"><span class="admin-kicker">Admin ·</span> ${title}</h1>
          <span class="admin-user" title="Signed in">${icon('user', { size: 16 })} ${signedInEmail()}</span>
          <button class="btn btn-sm admin-signout" data-action="sign-out" aria-label="Sign out">${icon('signOut', { size: 18 })}<span>Sign out</span></button>
        </div>
      </header>
      <main class="admin-main">${body}</main>
      ${dock(active)}
    </div>`;
}

// Every admin page: guarded, titled, and able to sign out.
export function adminPage({ active, title, render, actions = {}, inputs = {}, submits = {}, mounted }) {
  return {
    title: typeof title === 'function' ? 'Job card' : title,
    surface: 'admin',
    guard: requireAdmin,
    render: (params) => adminLayout({ active, title: typeof title === 'function' ? title(params) : title, body: render(params) }),
    actions: {
      'sign-out'() {
        logout();
        navigate('/login');
      },
      ...actions,
    },
    inputs,
    submits,
    mounted,
  };
}
