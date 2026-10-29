// Boot: register routes, re-render on every state change, then start the tab channel and the
// router.

import { addRoute, startRouter, refresh } from './router.js';
import { subscribe } from './state.js';
import { startChannel } from './channel.js';
import { landing } from './views/landing.js';
import { bookPage, bookedPage } from './views/book.js';
import { checkinPage, slipPage } from './views/checkin.js';

addRoute('/', landing);
addRoute('/book', bookPage);
addRoute('/booked/:id', bookedPage);
addRoute('/checkin', checkinPage);
addRoute('/slip/:id', slipPage);

subscribe(() => refresh());
startChannel();
startRouter(document.getElementById('app'));
