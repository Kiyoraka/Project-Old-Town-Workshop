// QR codes as inline SVG, drawn by the vendored qrcode-generator (MIT, Kazuhiko Arase), which
// index.html loads as a classic script before the modules. Long links (a snapshot inside the
// hash) drop to the lowest error correction so the code stays scannable from a screen.

import { raw } from './ui.js';

export function qrSvg(text, { label = '' } = {}) {
  const make = window.qrcode;
  if (!make) return raw('');
  const qr = make(0, text.length > 300 ? 'L' : 'M');
  qr.addData(text);
  qr.make();
  return raw(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: label || null }));
}
