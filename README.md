# Old Town Workshop — Workshop POS Mockup

A clickable mockup of a point-of-sale and management system for a small car workshop (*bengkel*): customers book a slot and check in by QR, the workshop runs every job from inspection to ready, parts come out of inventory, payment goes through a gateway, and the invoice reaches the customer's WhatsApp in one tap.

Plain HTML, CSS and JavaScript. No framework, no build step, no backend. Every name, plate, phone number and registration in it is fictional.

Live (once GitHub Pages is on): https://kiyoraka.github.io/Project-Old-Town-Workshop/

## Run it locally

Any static server works, for example:

```
python -m http.server 5500
```

then open http://localhost:5500/. Opening `index.html` straight from disk will not work, because the scripts are ES modules.

## Demo sign-in

The back office (`#/admin`) accepts **any** email address and **any** password. The login page also has a "Fill demo login" button.

## What is in it

| Customer side | |
|---|---|
| `#/` | Landing: book, check in, track; services with "from" prices; the counter's check-in QR; bays right now |
| `#/book` | Book a slot: service, day, free bay slot, car and WhatsApp number |
| `#/booked/:id` | Booking confirmation with a QR that opens check-in with the booking ready |
| `#/checkin` | The page the counter QR opens: by plate or booking code, or as a walk-in |
| `#/slip/:id` | Check-in slip with the queue number and a QR to follow the job |
| `#/track` · `#/job/:id` | Live job tracker: checked in, inspecting, in service, ready, paid |
| `#/invoice/:no` | The invoice, laid out like the client's sample, printable on A4 |

| Workshop side (after sign-in) | |
|---|---|
| `#/admin` | Dashboard: takings, open jobs, bays now, jobs by stage, today's bookings, reorder list, the week |
| `#/admin/jobs` · `#/admin/job/:id` | Job board and job card: stage, mechanic, bay, labour, parts taken from stock |
| `#/admin/checkout/:id` | Checkout with discount and SST, then the payment gateway (demo) |
| `#/admin/paid/:no` | Paid: **Send to WhatsApp** in one tap, view or print the invoice |
| `#/admin/bookings` | Day by bay booking grid, confirm, check in, cancel |
| `#/admin/inventory` | Parts, low-stock filter, stock in, movement log |
| `#/admin/staff` | Staff, roles, who is on today |
| `#/admin/settings` | Workshop details, invoice and SST, WhatsApp target and message, bays, check-in QR stand (A5), reset demo data |

## How the demo behaves

- **Data lives in this browser** (localStorage). A refresh keeps your walkthrough; *Settings › Reset demo data* brings the sample workshop back, and it resets on its own each new day so "today" is always today.
- **Two tabs stay in step.** Check a car in on one tab and it appears on the job board in another; take payment and the customer's tracker turns to Paid.
- **Links work on any phone.** A job or invoice made during the demo carries a small snapshot inside its link, so the QR on the slip and the invoice link sent on WhatsApp open on a phone that has never seen this browser.
- **WhatsApp is one tap, not automatic.** After payment, *Send to WhatsApp* opens WhatsApp with the message and invoice link already typed. Sending with no tap at all needs the WhatsApp Business API, which is a phase-2 cost.
- **The payment gateway is a demo.** DuitNow QR, FPX, card terminal and cash all end in a paid invoice; no money moves and no card details are asked for.

## Install it as an app

The mockup is a Progressive Web App. On its live (https) address:

- **Android / desktop Chrome**: tap **Install the app** on the landing page or in *Settings*, or use the browser menu › *Install app*.
- **iPhone (Safari)**: *Share* › *Add to Home Screen*.

Installed, it opens full screen from the rust Old Town icon, the customer side has a bottom tab bar on the phone (Home · Book · Check in · My job · Staff), and it keeps working without signal: every file is cached by `sw.js`.

**On every deploy, bump `CACHE` in `sw.js`** (`otw-v2` → `otw-v3` …). The new build is then cached in one piece and replaces the old one; without the bump, installed phones keep the old app. A file added to the app also goes into `APP_SHELL` there.

## Files

```
index.html            page shell, fonts, OG tags, manifest + Apple meta
manifest.webmanifest  the installable app: name, icons, standalone, shortcuts
sw.js                 offline cache (bump CACHE on every deploy)
js/pwa.js             service worker registration + install prompt
css/                  base (theme tokens), public, invoice (+ print), admin, mobile
js/main.js            routes
js/router.js          hash router
js/state.js           one shared state: actions + selectors
js/data.js            fictional seed data
js/store.js           localStorage
js/channel.js         sync between tabs
js/share.js           snapshot links + WhatsApp links
js/qr.js              QR codes (js/vendor/qrcode-generator.js, MIT)
js/views/             customer pages; js/views/admin/ back office
assets/images/        renders (WebP) + og-cover.jpg
assets/icons/         app icons (192, 512, maskable, Apple)
```
