// Hash router. Each view module exports:
//   render(params)  -> html`` markup for the page
//   actions         -> { name(el, event) } run for clicks on [data-action="name"]
//   submits         -> { name(form, event) } run for <form data-submit="name">
//   inputs          -> { name(el, event) } run for input/change on [data-input="name"]
//   guard           -> optional (params) => redirect hash (or null) checked before render
//   mounted         -> optional (root, params) => run after every render (focus, timers)
//   title           -> optional page title suffix
// Query strings ride after the path (#/invoice/INV-OTW-0000078?d=...) and are read with
// queryParam(); they never take part in matching.
// State changes call refresh(); it skips while the user is typing or a modal is open,
// so a change from another tab never wipes a half-filled form.

import { html } from './ui.js';

const routes = [];
// Handlers that work on every page; a page's own handler wins.
const global = { actions: {}, submits: {}, inputs: {} };
let current = null;
let root = null;

export function addRoute(pattern, view) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  }) + '/?$');
  routes.push({ regex, keys, view });
}

function match(path) {
  for (const route of routes) {
    const found = path.match(route.regex);
    if (found) {
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(found[i + 1]); });
      return { view: route.view, params };
    }
  }
  return null;
}

export function currentPath() {
  return (location.hash.replace(/^#/, '') || '/').split('?')[0];
}

export function addGlobalHandlers({ actions = {}, submits = {}, inputs = {} }) {
  Object.assign(global.actions, actions);
  Object.assign(global.submits, submits);
  Object.assign(global.inputs, inputs);
}

export function queryParam(name) {
  const query = location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get(name);
}

export function navigate(path) {
  if (location.hash.replace(/^#/, '') === path) render();
  else location.hash = path;
}

const notFound = {
  title: 'Not found',
  render: () => html`
    <main class="container not-found">
      <div class="big-wrench">404</div>
      <h2 class="sign-title">That bay is empty.</h2>
      <p class="muted">The page you asked for is not in this workshop.</p>
      <a class="btn btn-primary" href="#/">Back to the workshop</a>
    </main>`,
};

function render() {
  const found = match(currentPath()) || { view: notFound, params: {} };
  const redirect = found.view.guard?.(found.params);
  if (redirect) { navigate(redirect); return; }

  const changedPage = !current || current.view !== found.view || location.hash !== current.hash;
  current = { ...found, hash: location.hash };
  root.innerHTML = found.view.render(found.params).toString();
  document.title = found.view.title ? `${found.view.title} · Old Town Workshop` : 'Old Town Workshop — Workshop POS, Bookings & Invoices';
  document.body.dataset.surface = found.view.surface || 'public';
  if (changedPage) window.scrollTo(0, 0);
  found.view.mounted?.(root, found.params);
}

function isBusy() {
  const active = document.activeElement;
  const typing = active && root.contains(active) && active.matches('input, textarea, select');
  return typing || root.querySelector('.modal-backdrop, .sheet-backdrop') !== null;
}

// Re-render the current page after a state change.
export function refresh({ force = false } = {}) {
  if (!current) return;
  if (!force && isBusy()) return;
  render();
}

export function startRouter(mountEl) {
  root = mountEl;

  root.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    // data-self (a backdrop): act only on a click on the element itself, never on its children,
    // so buttons and form submits inside a dialog keep their own behaviour.
    if (el.hasAttribute('data-self') && event.target !== el) return;
    const name = el.dataset.action;
    const handler = current?.view.actions?.[name] || global.actions[name];
    if (handler) { event.preventDefault(); handler(el, event); }
  });

  // Enter / Space on a focusable [data-action] that is not a button acts like a click.
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.querySelector('.modal-backdrop, .sheet-backdrop')) {
      root.querySelector('[data-action][data-self]')?.click();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target.closest('[data-action][tabindex]');
    if (!el || el.matches('button, a, input, select, textarea')) return;
    event.preventDefault();
    el.click();
  });

  root.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-submit]');
    if (!form) return;
    event.preventDefault();
    const name = form.dataset.submit;
    (current?.view.submits?.[name] || global.submits[name])?.(form, event);
  });

  const onInput = (event) => {
    const el = event.target.closest('[data-input]');
    if (!el) return;
    const name = el.dataset.input;
    (current?.view.inputs?.[name] || global.inputs[name])?.(el, event);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);

  window.addEventListener('hashchange', render);
  render();
}
