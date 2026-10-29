// Boot: register routes, re-render on every state change, then start the tab channel and the
// router.

import { addRoute, startRouter, refresh } from './router.js';
import { subscribe } from './state.js';
import { startChannel } from './channel.js';

subscribe(() => refresh());
startChannel();
startRouter(document.getElementById('app'));
