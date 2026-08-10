/* Headless check for the two modules that only ever run at the worst possible
 * moment: Offers and Interviews.
 *
 * Both ship empty on purpose — Wang has no offers and no scheduled interviews
 * yet — so every other test in this repo walks past them and reports "renders,
 * 0 errors". That proves nothing about the code that fires the first time a
 * real offer lands. This file drives the whole flow instead: open the form,
 * type numbers, submit, then read the rendered arithmetic back and assert it.
 *
 * The one property worth guarding hardest: equity must never be blended into
 * the cash column. A private-company equity number is a company estimate, not
 * money, and an app that sums it into "total cash" would lie to Wang at the
 * exact moment he is deciding whether to take a job.
 *
 * Run with:  node verify-offers.mjs   (after `npm run build`)
 */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find(f => f.endsWith('.js'));
const js = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8');

const errors = [];
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window: w } = dom;
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
w.scrollTo = () => {};
w.confirm = () => true;
w.URL.createObjectURL = () => 'blob:x';
w.URL.revokeObjectURL = () => {};
Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
w.onerror = (m) => errors.push(String(m));
w.addEventListener('error', e => errors.push(String(e.error || e.message)));
const realErr = console.error;
console.error = (...a) => { const s = a.join(' '); if (!/not wrapped in act|validateDOMNesting/.test(s)) errors.push(s); };

w.eval(js);
await new Promise(r => setTimeout(r, 500));
const d = w.document;

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}${detail ? ' :: ' + detail : ''}`); fail++; }
};

const click = async (el, ms = 200) => {
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, ms));
};
const setInput = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
};
const setSelect = (el, value) => {
  Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
};
const nav = (label) => [...d.querySelectorAll('.nav-item')].find(b => (b.textContent || '').includes(label));
const main = () => d.querySelector('.content') || d.querySelector('main') || d.body;
const flat = () => (main().textContent || '').replace(/\s+/g, ' ');
const modal = () => d.querySelector('.modal');
const btn = (root, text) => [...root.querySelectorAll('button')].find(b => (b.textContent || '').trim() === text);

/* ============================ OFFERS ============================ */
console.log('\n-- offers --');

const offersNav = nav('Offers');
check('Offers nav item exists', !!offersNav);
if (!offersNav) { console.log('\noffers: cannot continue'); process.exit(1); }
await click(offersNav);
check('starts from a true empty state', /No offers yet/.test(flat()));

// ---- offer #1 -------------------------------------------------------
await click(btn(main(), '＋ Record Offer'));
check('record-offer modal opens', !!modal());
if (!modal()) { console.log('\noffers: form never opened'); process.exit(1); }

const jobSelect = modal().querySelector('select');
const firstJobLabel = jobSelect?.selectedOptions?.[0]?.textContent || '';
check('job picker is populated', (jobSelect?.options?.length || 0) > 10, `${jobSelect?.options?.length} options`);

const byPlaceholder = (p) => modal().querySelector(`input[placeholder="${p}"]`);
setInput(byPlaceholder('95000'), '95000');
setInput(byPlaceholder('10000'), '10000');
// Equity value is the second "optional" field (shares is the first).
const optionals = [...modal().querySelectorAll('input[placeholder="optional"]')];
check('equity shares + value fields both present', optionals.length === 2, `${optionals.length}`);
setInput(optionals[0], '4000');
setInput(optionals[1], '20000');
await click(btn(modal(), 'Record Offer'));

check('modal closes after submit', !modal());
const t1 = flat();
check('offer #1 renders', /\$95,000/.test(t1), t1.slice(0, 160));
check('cash total = base + bonus ($105,000)', /\$105,000/.test(t1));
check('equity is reported at its stated value', /\$20,000/.test(t1));
check('equity is NOT summed into cash total', !/\$125,000/.test(t1),
  'a $125,000 cash figure would mean equity got blended in');

// Recording an offer should drag the job into the offer stage — otherwise the
// pipeline and the offer list disagree about the same job.
const persisted = () => JSON.parse(w.localStorage.getItem('job-tracker-pro-v2') || '{}')?.state || {};
const s1 = persisted();
check('offer persisted to localStorage', (s1.offers || []).length === 1, `${(s1.offers || []).length}`);
const offer1 = (s1.offers || [])[0] || {};
check('stored base is a number, not a string', offer1.baseSalary === 95000, JSON.stringify(offer1.baseSalary));
const job1 = (s1.jobs || []).find(j => j.id === offer1.jobId);
check('linked job auto-advanced to an offer stage',
  ['offer', 'negotiating', 'accepted'].includes(job1?.status), `status=${job1?.status}`);

// ---- offer #2: the comparison table only exists with two ------------
await click(btn(main(), '＋ Record Offer'));
const sel2 = modal().querySelector('select');
// Pick a different job than offer #1 so the comparison has two distinct rows.
const other = [...sel2.options].find(o => o.value !== offer1.jobId);
setSelect(sel2, other.value);
setInput(modal().querySelector('input[placeholder="95000"]'), '110000');
setInput(modal().querySelector('input[placeholder="10000"]'), '5000');
await click(btn(modal(), 'Record Offer'));

const t2 = flat();
check('comparison table appears at 2 offers', /Comparison/.test(t2));
check('offer #2 cash total = $115,000', /\$115,000/.test(t2));
const rowsHtml = [...main().querySelectorAll('table.tbl tbody tr')];
check('comparison has one row per offer', rowsHtml.length === 2, `${rowsHtml.length} rows`);
check('highest-cash offer is flagged', /highest cash/.test(rowsHtml[0]?.textContent || ''),
  rowsHtml[0]?.textContent?.slice(0, 80));
// The ordering must be decided by cash alone. Offer #1 carries $20,000 of
// stated equity, so cash+equity would put it on top ($125,000 vs $115,000);
// cash alone correctly puts offer #2 on top. This assertion is the guard
// against equity quietly regaining a vote in the ranking.
check('ranked by cash, not by cash+equity',
  /110,000/.test(rowsHtml[0]?.textContent || ''), rowsHtml[0]?.textContent?.slice(0, 80));
check('the combined figure is still shown, just not ranked on', /\$125,000/.test(t2));

// ---- counter calculator --------------------------------------------
const detailsBtn = [...main().querySelectorAll('button')].filter(b => (b.textContent || '').trim() === 'Details')[0];
check('per-offer Details toggle exists', !!detailsBtn);
await click(detailsBtn);
const t3 = flat();
check('counter calculator renders', /Counter calculator/.test(t3));
// Top card is the $110,000 offer; the default ask is +10% = $121,000, and the
// midpoint landing is $115,500.
check('ask at +10% computes to $121,000', /\$121,000/.test(t3), t3.slice(t3.indexOf('Counter calculator'), t3.indexOf('Counter calculator') + 200));
check('midpoint landing computes to $115,500', /\$115,500/.test(t3));

const logBtn = [...main().querySelectorAll('button')].find(b => /^Log counter at/.test((b.textContent || '').trim()));
check('counter can be logged', !!logBtn);
await click(logBtn);
const s3 = persisted();
const topOffer = (s3.offers || []).find(o => o.baseSalary === 110000);
const hist = topOffer?.negotiationHistory || [];
check('negotiation history recorded the counter', hist.some(h => h.type === 'counter_sent'), JSON.stringify(hist.map(h => h.type)));
check('history entry carries a date', hist.every(h => !!h.date));
check('negotiation log is on screen', /Negotiation log/.test(flat()));

/* ========================== INTERVIEWS ========================== */
console.log('\n-- interviews --');

const ivNav = nav('Interviews');
await click(ivNav);
check('Interviews view opens', flat().length > 50);
const exportBtn = d.querySelector('[data-testid="export-ics"]');
check('calendar export is disabled while there are no interviews', !!exportBtn && exportBtn.disabled);

await click(btn(main(), '＋ Schedule Interview'));
check('schedule modal opens', !!modal());
if (modal()) {
  const ivJob = modal().querySelector('select');
  setSelect(ivJob, offer1.jobId);
  const typeSel = modal().querySelectorAll('select')[1];
  setSelect(typeSel, 'hiring_manager');
  setInput(modal().querySelector('input[type="date"]'), '2026-09-15');
  setInput(modal().querySelector('input[type="time"]'), '14:30');
  setInput(modal().querySelector('input[placeholder="Name / title"]'), 'Test Interviewer');
  await click(btn(modal(), 'Schedule'));

  check('schedule modal closes', !modal());
  const s4 = persisted();
  const iv = (s4.interviews || [])[0];
  check('interview persisted', !!iv, `${(s4.interviews || []).length} stored`);
  check('scheduledAt joins date and time correctly', iv?.scheduledAt === '2026-09-15T14:30:00', iv?.scheduledAt);
  check('interview type stored as chosen', iv?.type === 'hiring_manager', iv?.type);
  // The calendar must follow the booking to September 2026 — a round booked
  // into next month is invisible if the grid stays on the current month.
  const t5cal = flat();
  check('calendar jumps to the month of the new interview', /September 2026/.test(t5cal),
    t5cal.slice(0, 140));

  await click(btn(main(), 'list'));
  const t5 = flat();
  check('interview shows up in the list', /Test Interviewer/.test(t5) || /hiring_manager/.test(t5), t5.slice(0, 200));
  const exportBtn2 = d.querySelector('[data-testid="export-ics"]');
  check('calendar export becomes enabled', !!exportBtn2 && !exportBtn2.disabled);
}

/* ============================ WRAP ============================ */
console.error = realErr;
const realErrors = errors.filter(e => !/Could not parse CSS|jsdom/i.test(e));
check('zero runtime JS errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

console.log(`\noffers+interviews: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
