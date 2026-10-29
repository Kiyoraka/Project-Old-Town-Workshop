// #/login — staff sign-in. Any email and any password work (it says so on the page), with a
// one-tap demo fill. Errors show under their field; there are no browser dialogs.

import { html } from '../ui.js';
import { STATE } from '../state.js';
import { login, isSignedIn } from '../auth.js';
import { navigate, queryParam, refresh, currentPath } from '../router.js';
import { icon } from './icons.js';

let errors = {};
let draft = { email: '', password: '' };

// Guard for every admin page: signed out -> the login page, remembering where to return.
export function requireAdmin() {
  return isSignedIn() ? null : `/login?next=${encodeURIComponent(currentPath())}`;
}

function nextPath() {
  const next = queryParam('next');
  return next && next.startsWith('/admin') ? next : '/admin';
}

export const loginPage = {
  title: 'Staff sign in',
  dock: 'staff',
  guard: () => (isSignedIn() ? nextPath() : null),
  render() {
    return html`
      <main class="login">
        <figure class="login-photo">
          <img src="assets/images/login-counter.webp" width="900" height="1350"
               alt="The workshop counter at dusk: keys on brass hooks, a ticket spike and a payment QR stand" onerror="this.remove()">
          <figcaption class="login-caption"><span class="signboard-name">${STATE.shop.name}</span><span>${STATE.shop.tagline}</span></figcaption>
        </figure>
        <section class="login-panel">
          <div class="login-card card card-raised">
            <a class="signboard-name login-brand" href="#/">${STATE.shop.name}</a>
            <p class="eyebrow">Staff</p>
            <h1 class="sign-title">Sign in to the back office</h1>
            <form class="stack" data-submit="login" novalidate>
              <div class="field">
                <label for="login-email">Email</label>
                <input id="login-email" class="input" type="email" name="email" autocomplete="username"
                       value="${draft.email}" data-input="draft" aria-invalid="${errors.email ? 'true' : 'false'}"
                       aria-describedby="${errors.email ? 'login-email-error' : ''}">
                ${errors.email ? html`<span id="login-email-error" class="field-error">${errors.email}</span>` : ''}
              </div>
              <div class="field">
                <label for="login-password">Password</label>
                <input id="login-password" class="input" type="password" name="password" autocomplete="current-password"
                       value="${draft.password}" data-input="draft" aria-invalid="${errors.password ? 'true' : 'false'}"
                       aria-describedby="${errors.password ? 'login-password-error' : ''}">
                ${errors.password ? html`<span id="login-password-error" class="field-error">${errors.password}</span>` : ''}
              </div>
              <button class="btn btn-primary btn-block" type="submit">Sign in</button>
              <button class="btn btn-ghost btn-block" type="button" data-action="fill-demo">Fill demo login</button>
            </form>
            <p class="login-hint">${icon('check', { size: 16 })} Demo: any email and any password work.</p>
            <a class="login-back" href="#/">${icon('back', { size: 16 })} Back to the workshop</a>
          </div>
        </section>
      </main>`;
  },
  inputs: {
    draft(el) {
      draft[el.name] = el.value;
    },
  },
  actions: {
    'fill-demo'() {
      draft = { email: 'owner@oldtownworkshop.demo', password: 'demo' };
      errors = {};
      refresh({ force: true });
    },
  },
  submits: {
    login(form) {
      const data = new FormData(form);
      draft = { email: String(data.get('email') || ''), password: String(data.get('password') || '') };
      const result = login(draft.email, draft.password);
      if (!result.ok) {
        errors = result.errors;
        refresh({ force: true });
        document.querySelector(errors.email ? '#login-email' : '#login-password')?.focus();
        return;
      }
      errors = {};
      draft = { email: '', password: '' };
      navigate(nextPath());
    },
  },
};
