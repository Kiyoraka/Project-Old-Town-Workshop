// Seed data for a fictional workshop. Every name, plate, phone number and registration below is
// made up for the demo. seed() builds a fresh state with every date relative to today, so the
// dashboard always shows a busy "today" however late the page is opened.

import { dayStr, addDays, round2 } from './ui.js';

export const STATE_VERSION = 1;

export const JOB_STATUSES = [
  { id: 'checked-in', label: 'Checked in', short: 'In' },
  { id: 'inspecting', label: 'Inspecting', short: 'Inspect' },
  { id: 'in-service', label: 'In service', short: 'Service' },
  { id: 'ready', label: 'Ready', short: 'Ready' },
  { id: 'paid', label: 'Paid', short: 'Paid' },
];

export const ROLES = [
  { id: 'owner', label: 'Owner', can: ['Everything', 'Reports + settings', 'Staff'] },
  { id: 'advisor', label: 'Advisor / Cashier', can: ['Bookings + check-in', 'Job cards', 'Take payment'] },
  { id: 'mechanic', label: 'Mechanic', can: ['Own jobs', 'Add parts used', 'Move job status'] },
];

export const PAYMENT_METHODS = [
  { id: 'duitnow', label: 'DuitNow QR' },
  { id: 'fpx', label: 'FPX online banking' },
  { id: 'card', label: 'Debit / credit card' },
  { id: 'cash', label: 'Cash' },
];

// Opening hours as bookable one-hour slots; 1 PM is lunch.
export const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const SERVICES = [
  { id: 'sv-abs-f', name: 'Absorber replace (front pair)', category: 'Absorber', price: 80, minutes: 60 },
  { id: 'sv-abs-r', name: 'Absorber replace (rear pair)', category: 'Absorber', price: 80, minutes: 60 },
  { id: 'sv-recon', name: 'Absorber recon / restoration (per unit)', category: 'Restoration', price: 120, minutes: 90 },
  { id: 'sv-coil', name: 'Coilover install and setup', category: 'Absorber', price: 300, minutes: 150 },
  { id: 'sv-align', name: 'Wheel alignment', category: 'Alignment', price: 60, minutes: 30 },
  { id: 'sv-balance', name: 'Wheel balancing (4 wheels)', category: 'Alignment', price: 40, minutes: 30 },
  { id: 'sv-oil', name: 'Engine oil service (labour)', category: 'Servis', price: 30, minutes: 30 },
  { id: 'sv-brake', name: 'Brake pad replace (labour)', category: 'Brek', price: 40, minutes: 45 },
  { id: 'sv-bush', name: 'Bush and link replace (labour)', category: 'Servis', price: 50, minutes: 60 },
  { id: 'sv-inspect', name: 'Suspension inspection', category: 'Inspection', price: 20, minutes: 20 },
];

// [sku, name, brand, fits, qty, min, cost, price]
const PARTS = [
  ['KYB-EG-MYF', 'Absorber front pair', 'KYB Excel-G', 'Perodua Myvi', 6, 2, 240, 320],
  ['KYB-EG-MYR', 'Absorber rear pair', 'KYB Excel-G', 'Perodua Myvi', 4, 2, 210, 280],
  ['KYB-EG-AXF', 'Absorber front pair', 'KYB Excel-G', 'Perodua Axia / Bezza', 5, 2, 225, 300],
  ['TKC-VIOS-F', 'Absorber front pair', 'Tokico', 'Toyota Vios', 3, 2, 290, 380],
  ['TKC-CITY-F', 'Absorber front pair', 'Tokico', 'Honda City', 3, 2, 300, 390],
  ['KYB-SR-SAGA', 'Absorber front pair', 'KYB New SR', 'Proton Saga', 4, 2, 190, 260],
  ['MNR-HLX-R', 'Absorber rear pair', 'Monroe', 'Toyota Hilux', 2, 1, 320, 420],
  ['OTW-RECON-KIT', 'Absorber recon seal kit (per unit)', 'Old Town', 'Universal', 14, 6, 18, 45],
  ['OTW-ABS-OIL', 'Absorber oil 1L', 'Old Town', 'Universal', 2, 3, 14, 35],
  ['BC-BR-COIL', 'Coilover set (BR series)', 'BC Racing', 'Honda Civic FC / City GN2', 1, 1, 2500, 3200],
  ['MNT-MYV-F', 'Absorber mounting front', 'OEM grade', 'Perodua Myvi', 8, 4, 30, 55],
  ['MNT-AXI-F', 'Absorber mounting front', 'OEM grade', 'Perodua Axia', 6, 4, 28, 50],
  ['BMP-STOP', 'Bump stop + boot set', 'OEM grade', 'Universal', 10, 4, 16, 40],
  ['LNK-STAB-F', 'Stabilizer link front pair', '555', 'Myvi / Axia / Bezza', 5, 2, 45, 90],
  ['BUSH-LWR', 'Lower arm bush (piece)', 'OEM grade', 'Universal', 1, 4, 9, 25],
  ['BUSH-STAB', 'Stabilizer bush pair', 'OEM grade', 'Universal', 7, 4, 11, 30],
  ['OIL-5W30-4L', 'Engine oil 5W-30 fully synthetic 4L', 'Old Town Select', 'Petrol', 9, 4, 110, 165],
  ['OIL-10W40-4L', 'Engine oil 10W-40 semi synthetic 4L', 'Old Town Select', 'Petrol', 12, 4, 70, 110],
  ['FLT-OIL-P', 'Oil filter', 'OEM grade', 'Perodua', 15, 6, 7, 18],
  ['FLT-OIL-T', 'Oil filter', 'OEM grade', 'Toyota / Honda', 11, 6, 8, 22],
  ['BRK-PAD-MYF', 'Brake pad front', 'Bendix', 'Perodua Myvi', 2, 2, 50, 95],
  ['BRK-PAD-VIF', 'Brake pad front', 'Bendix', 'Toyota Vios / Honda City', 4, 2, 65, 120],
  ['BRK-FLUID', 'Brake fluid DOT4 1L', 'Old Town Select', 'Universal', 6, 3, 15, 35],
  ['WHL-WEIGHT', 'Wheel balancing weights (set)', 'Old Town', 'Universal', 30, 10, 3, 10],
];

// [plate, model, name, phone]
const VEHICLES = [
  ['WXY 1234', 'Perodua Myvi', 'Hafiz', '012-000 1001'],
  ['JKL 88', 'Honda City', 'Nurul', '013-000 1002'],
  ['VBN 5512', 'Toyota Vios', 'Kumar', '016-000 1003'],
  ['VAB 2210', 'Proton Saga', 'Aisyah', '017-000 1004'],
  ['PJH 7731', 'Perodua Axia', 'Daniel', '011-000 1005'],
  ['WVC 909', 'Toyota Hilux', 'Encik Rahman', '019-000 1006'],
  ['BKL 4420', 'Perodua Bezza', 'Mei Ling', '012-000 1007'],
  ['DEF 6618', 'Honda Civic', 'Arif', '014-000 1008'],
  ['WTA 3307', 'Perodua Myvi', 'Farah', '018-000 1009'],
  ['KCL 1180', 'Proton X50', 'Zul', '013-000 1010'],
  ['NAA 5521', 'Toyota Vios', 'Siva', '016-000 1011'],
  ['QMM 2045', 'Honda City', 'Hana', '017-000 1012'],
  ['MCA 6140', 'Perodua Alza', 'Iskandar', '019-000 1013'],
  ['BPP 3398', 'Perodua Myvi', 'Lim', '011-000 1014'],
];

const STAFF = [
  { id: 's1', name: 'Pak Mat', role: 'owner', phone: '012-000 0101', active: true, since: '2009' },
  { id: 's2', name: 'Siti Aminah', role: 'advisor', phone: '012-000 0102', active: true, since: '2018' },
  { id: 's3', name: 'Ali', role: 'mechanic', phone: '012-000 0103', active: true, since: '2015' },
  { id: 's4', name: 'Raju', role: 'mechanic', phone: '012-000 0104', active: true, since: '2017' },
  { id: 's5', name: 'Ah Keong', role: 'mechanic', phone: '012-000 0105', active: true, since: '2020' },
  { id: 's6', name: 'Faiz', role: 'mechanic', phone: '012-000 0106', active: false, since: '2024' },
];

export const WA_TEMPLATE = 'Terima kasih {name}! Invois {invoice} untuk kenderaan {plate} berjumlah {total} telah DIBAYAR.\n\nLihat invois: {link}\n\n— {shop}';

// A small deterministic random source, so every seed tells the same story.
function rng(seedValue) {
  let a = seedValue;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n, width) => String(n).padStart(width, '0');

export function seed() {
  const random = rng(20261029);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60000).toISOString();
  const today = dayStr();

  const services = SERVICES.map((s) => ({ ...s }));
  const parts = PARTS.map(([sku, name, brand, fits, qty, min, cost, price], i) => ({
    id: `p${i + 1}`, sku, name, brand, fits, qty, min, cost, price,
  }));
  const vehicles = VEHICLES.map(([plate, model, name, phone]) => ({ plate, model, name, phone }));
  const staff = STAFF.map((s) => ({ ...s }));
  const service = (id) => services.find((s) => s.id === id);
  const part = (sku) => parts.find((p) => p.sku === sku);
  const vehicle = (plate) => vehicles.find((v) => v.plate === plate);

  let lineCounter = 1;
  const serviceLine = (id, qty = 1, discount = 0) => {
    const s = service(id);
    return { id: `L${lineCounter++}`, kind: 'service', refId: s.id, name: s.name, qty, price: s.price, discount };
  };
  const partLine = (sku, qty = 1) => {
    const p = part(sku);
    return { id: `L${lineCounter++}`, kind: 'part', refId: p.id, name: `${p.name} (${p.brand})`, qty, price: p.price, discount: 0 };
  };

  // What a typical job on each kind of car looks like.
  const absorberFor = {
    'Perodua Myvi': 'KYB-EG-MYF', 'Perodua Axia': 'KYB-EG-AXF', 'Perodua Bezza': 'KYB-EG-AXF',
    'Toyota Vios': 'TKC-VIOS-F', 'Honda City': 'TKC-CITY-F', 'Proton Saga': 'KYB-SR-SAGA',
  };
  const recipes = [
    (v) => [serviceLine('sv-abs-f'), partLine(absorberFor[v.model] || 'KYB-EG-MYF')],
    () => [serviceLine('sv-oil'), partLine('OIL-10W40-4L'), partLine('FLT-OIL-P')],
    () => [serviceLine('sv-align'), serviceLine('sv-balance'), partLine('WHL-WEIGHT')],
    () => [serviceLine('sv-recon', 2, 24), partLine('OTW-RECON-KIT', 2), partLine('OTW-ABS-OIL')],
    () => [serviceLine('sv-brake'), partLine('BRK-PAD-MYF')],
    () => [serviceLine('sv-bush', 1, 5), partLine('BUSH-LWR', 2), partLine('LNK-STAB-F')],
    () => [serviceLine('sv-oil'), partLine('OIL-5W30-4L'), partLine('FLT-OIL-T')],
  ];

  const lineNet = (l) => l.qty * l.price - l.discount;
  const makeInvoice = (no, job, paidAt, method) => {
    const subtotal = round2(job.lines.reduce((sum, l) => sum + lineNet(l), 0));
    return {
      no: `INV-OTW-${pad(no, 7)}`, jobId: job.id,
      name: job.name, phone: job.phone, plate: job.plate, model: job.model,
      issuedAt: paidAt, paidAt,
      lines: job.lines.map(({ name, qty, price, discount }) => ({ name, qty, price, discount })),
      discount: 0, subtotal, sstRate: 0, sst: 0, total: subtotal,
      payments: [{ method, amount: subtotal, at: paidAt }],
    };
  };
  const methods = ['duitnow', 'duitnow', 'duitnow', 'cash', 'card', 'fpx'];

  // ---- history: 25 paid invoices over the past 13 days (INV-OTW-0000048 to 0000072) ----
  const invoices = [];
  let invoiceNo = 48;
  let oldJob = 381;
  for (let back = 13; back >= 1; back--) {
    const perDay = back % 6 === 0 ? 1 : 2;
    for (let k = 0; k < perDay && invoiceNo <= 72; k++) {
      const v = pick(vehicles);
      const job = { id: `JOB-${pad(oldJob++, 4)}`, name: v.name, phone: v.phone, plate: v.plate, model: v.model, lines: pick(recipes)(v) };
      const day = new Date(now - back * 86400000);
      day.setHours(10 + k * 4, Math.floor(random() * 50), Math.floor(random() * 59), 0);
      invoices.push(makeInvoice(invoiceNo++, job, day.toISOString(), pick(methods)));
    }
  }
  invoiceNo = 73;

  // ---- today: five paid jobs (INV-OTW-0000073 to 0000077) and seven open ones ----
  const jobs = [];
  const job = (id, plate, status, extra) => {
    const v = vehicle(plate);
    return {
      id, status, plate: v.plate, model: v.model, name: v.name, phone: v.phone,
      bay: null, mechanicId: null, queueNo: 0, bookingId: null, notes: '',
      checkedInAt: null, statusAt: {}, lines: [], invoiceNo: null, ...extra,
    };
  };
  const paidToday = [
    ['JOB-0406', 'QMM 2045', 0, 's3', 470], ['JOB-0407', 'KCL 1180', 3, 's4', 430],
    ['JOB-0408', 'MCA 6140', 1, 's5', 390], ['JOB-0409', 'NAA 5521', 4, 's3', 340],
    ['JOB-0410', 'BPP 3398', 5, 's4', 280],
  ];
  paidToday.forEach(([id, plate, recipe, mechanicId, inAgo], i) => {
    const v = vehicle(plate);
    const j = job(id, plate, 'paid', { mechanicId, queueNo: i + 1, checkedInAt: minutesAgo(inAgo), lines: recipes[recipe](v) });
    const paidAt = minutesAgo(inAgo - 75);
    j.statusAt = { 'checked-in': j.checkedInAt, ready: minutesAgo(inAgo - 70), paid: paidAt };
    j.invoiceNo = `INV-OTW-${pad(invoiceNo, 7)}`;
    invoices.push(makeInvoice(invoiceNo++, j, paidAt, methods[i % methods.length]));
    jobs.push(j);
  });

  const open = [
    job('JOB-0411', 'VAB 2210', 'ready', { mechanicId: 's4', queueNo: 6, checkedInAt: minutesAgo(200),
      lines: [serviceLine('sv-oil'), partLine('OIL-10W40-4L'), partLine('FLT-OIL-P')] }),
    job('JOB-0412', 'VBN 5512', 'in-service', { bay: 1, mechanicId: 's3', queueNo: 7, bookingId: 'BK-0224', checkedInAt: minutesAgo(150),
      lines: [serviceLine('sv-abs-f'), partLine('TKC-VIOS-F'), partLine('MNT-MYV-F', 2)] }),
    job('JOB-0413', 'DEF 6618', 'in-service', { bay: 4, mechanicId: 's5', queueNo: 8, bookingId: 'BK-0225', checkedInAt: minutesAgo(130),
      lines: [serviceLine('sv-coil'), partLine('BC-BR-COIL'), serviceLine('sv-align')] }),
    job('JOB-0414', 'WVC 909', 'in-service', { bay: 3, mechanicId: 's4', queueNo: 9, checkedInAt: minutesAgo(95),
      lines: [serviceLine('sv-abs-r'), partLine('MNR-HLX-R')] }),
    job('JOB-0415', 'JKL 88', 'inspecting', { bay: 2, mechanicId: 's3', queueNo: 10, checkedInAt: minutesAgo(50),
      notes: 'Bunyi berketuk bila lalu bonggol, depan kanan.', lines: [serviceLine('sv-inspect')] }),
    job('JOB-0416', 'BKL 4420', 'checked-in', { queueNo: 11, bookingId: 'BK-0226', checkedInAt: minutesAgo(25),
      lines: [serviceLine('sv-abs-f')] }),
    job('JOB-0417', 'PJH 7731', 'checked-in', { queueNo: 12, checkedInAt: minutesAgo(8),
      notes: 'Walk-in. Bunyi berketuk depan kiri.' }),
  ];
  const order = ['checked-in', 'inspecting', 'in-service', 'ready'];
  open.forEach((j) => {
    j.statusAt = { 'checked-in': j.checkedInAt };
    const reached = order.indexOf(j.status);
    order.slice(1, reached + 1).forEach((s, k) => {
      j.statusAt[s] = new Date(new Date(j.checkedInAt).getTime() + (k + 1) * 15 * 60000).toISOString();
    });
    jobs.push(j);
  });

  // ---- bookings: yesterday, today and the next two days ----
  const b = (id, date, time, bay, serviceId, plate, status, jobId = null) => {
    const v = vehicle(plate);
    return { id, date, time, bay, serviceId, plate: v.plate, model: v.model, name: v.name, phone: v.phone, notes: '', status, jobId, createdAt: minutesAgo(60 * 24 * 2) };
  };
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const bookings = [
    b('BK-0221', yesterday, '09:00', 1, 'sv-oil', 'NAA 5521', 'checked-in'),
    b('BK-0222', yesterday, '11:00', 2, 'sv-abs-r', 'KCL 1180', 'checked-in'),
    b('BK-0223', yesterday, '15:00', 3, 'sv-brake', 'QMM 2045', 'cancelled'),
    b('BK-0224', today, '09:00', 1, 'sv-abs-f', 'VBN 5512', 'checked-in', 'JOB-0412'),
    b('BK-0225', today, '10:00', 4, 'sv-coil', 'DEF 6618', 'checked-in', 'JOB-0413'),
    b('BK-0226', today, '11:00', 2, 'sv-abs-f', 'BKL 4420', 'checked-in', 'JOB-0416'),
    b('BK-0227', today, '15:00', 2, 'sv-abs-f', 'WXY 1234', 'confirmed'),
    b('BK-0228', today, '16:00', 1, 'sv-align', 'WTA 3307', 'confirmed'),
    b('BK-0229', tomorrow, '09:00', 1, 'sv-recon', 'KCL 1180', 'confirmed'),
    b('BK-0230', tomorrow, '10:00', 3, 'sv-brake', 'NAA 5521', 'pending'),
  ];

  // ---- stock movements: a delivery last week, then every part used on today's jobs ----
  let moveCounter = 1;
  const stockMoves = [];
  parts.forEach((p) => {
    stockMoves.push({ id: `M${moveCounter++}`, partId: p.id, at: minutesAgo(60 * 24 * 6), qty: p.qty + 4, kind: 'in', ref: 'Supplier delivery' });
  });
  jobs.forEach((j) => j.lines.filter((l) => l.kind === 'part').forEach((l) => {
    stockMoves.push({ id: `M${moveCounter++}`, partId: l.refId, at: j.checkedInAt, qty: -l.qty, kind: 'used', ref: j.id });
  }));

  return {
    version: STATE_VERSION,
    seedDay: today,
    shop: {
      name: 'Old Town Workshop',
      tagline: 'absorber · restoration · servis',
      ssm: '202600000000 (DEMO-0001-X)',
      phone: '+60 3-0000 0000',
      address: '12 Jalan Bengkel Lama, Old Town, 00000 Demo City',
      hoursOpen: '09:00',
      hoursClose: '18:00',
    },
    settings: {
      invoicePrefix: 'INV-OTW-',
      sstEnabled: false,
      sstRate: 8,
      waTarget: 'choose',          // 'choose' | 'customer' | 'demo'
      demoPhone: '',
      waTemplate: WA_TEMPLATE,
    },
    bays: [
      { id: 1, name: 'Bay 1', label: 'Absorber' },
      { id: 2, name: 'Bay 2', label: 'Absorber' },
      { id: 3, name: 'Bay 3', label: 'Lift' },
      { id: 4, name: 'Bay 4', label: 'Alignment' },
    ],
    staff,
    services,
    parts,
    vehicles,
    bookings,
    jobs,
    invoices,
    stockMoves,
    counters: { job: 418, booking: 231, invoice: invoiceNo, line: lineCounter, move: moveCounter, part: parts.length + 1, staff: staff.length + 1 },
  };
}
