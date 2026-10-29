// Boot: register routes, re-render on every state change, then start the tab channel and the
// router.

import { addRoute, startRouter, refresh } from './router.js';
import { subscribe } from './state.js';
import { startChannel } from './channel.js';
import { landing } from './views/landing.js';
import { bookPage, bookedPage } from './views/book.js';
import { checkinPage, slipPage } from './views/checkin.js';
import { jobPage, trackPage } from './views/job.js';
import { invoicePage } from './views/invoice.js';
import { loginPage } from './views/login.js';
import { dashboardPage } from './views/admin/dashboard.js';
import { jobsPage } from './views/admin/jobs.js';
import { jobCardPage } from './views/admin/job-card.js';
import { checkoutPage } from './views/admin/checkout.js';
import { paidPage } from './views/admin/paid.js';
import { bookingsPage } from './views/admin/bookings.js';

addRoute('/', landing);
addRoute('/book', bookPage);
addRoute('/booked/:id', bookedPage);
addRoute('/checkin', checkinPage);
addRoute('/slip/:id', slipPage);
addRoute('/track', trackPage);
addRoute('/job/:id', jobPage);
addRoute('/invoice/:no', invoicePage);
addRoute('/login', loginPage);
addRoute('/admin', dashboardPage);
addRoute('/admin/jobs', jobsPage);
addRoute('/admin/job/:id', jobCardPage);
addRoute('/admin/checkout/:id', checkoutPage);
addRoute('/admin/paid/:no', paidPage);
addRoute('/admin/bookings', bookingsPage);

subscribe(() => refresh());
startChannel();
startRouter(document.getElementById('app'));
