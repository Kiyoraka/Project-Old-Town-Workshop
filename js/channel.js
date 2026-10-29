// Same-browser sync between tabs: a job checked in on the customer's tab lands on the admin
// board in another, a status change there moves the customer's tracker here, and a payment
// flips it to PAID. Every change posts the whole state (it is small); a receiving tab adopts it
// without echoing. A browser without BroadcastChannel simply runs each tab alone, and the
// localStorage copy still catches it up on the next load.

import { onChange, adoptState, STATE } from './state.js';
import { STATE_VERSION } from './data.js';

let channel = null;
let applying = false;

export function startChannel() {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel('otw');

  channel.addEventListener('message', (message) => {
    const data = message.data;
    // A tab that just opened says hello; every open tab answers with what it knows.
    if (data?.type === 'hello') {
      post({ type: 'state', state: STATE });
      return;
    }
    if (data?.type !== 'state' || !data.state) return;
    // A tab still running an older build (or yesterday's seed) must never overwrite this one.
    if (data.state.version !== STATE_VERSION || data.state.seedDay !== STATE.seedDay) return;
    applying = true;
    try { adoptState(data.state); } finally { applying = false; }
  });

  onChange(() => {
    if (applying) return;     // never echo what another tab just told us
    post({ type: 'state', state: STATE });
  });

  post({ type: 'hello' });
}

function post(message) {
  try { channel.postMessage(JSON.parse(JSON.stringify(message))); } catch { /* closed channel */ }
}
