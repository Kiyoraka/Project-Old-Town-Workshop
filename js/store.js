// localStorage for the demo, so a walkthrough survives a refresh. A stored state from an older
// version, from another day, or one that fails to parse is thrown away and the seed comes back,
// so "today" on the dashboard is always today. Storage may be blocked (private windows): every
// call is guarded and the demo still runs in memory.

import { STATE_VERSION } from './data.js';
import { dayStr } from './ui.js';

const KEY = 'otw_state_v1';

export function load() {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return null;
    const state = JSON.parse(text);
    if (state?.version !== STATE_VERSION || state.seedDay !== dayStr()) return null;
    return state;
  } catch {
    return null;
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked or full: memory only */ }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
