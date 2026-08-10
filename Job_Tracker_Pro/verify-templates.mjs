// Drives the REAL built bundle in jsdom and asserts the seed8 outreach templates
// actually reach the Templates view — not just that the module exports them.
//
// The trap this guards against: a seed file can parse, typecheck, and export 47
// objects while the store never merges them, and every "count the rows" assertion
// still passes because the hand-written playbook templates are already there.
// So every assertion below is anchored on an id/string that ONLY seed8 can produce.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find(f => f.endsWith('.js'));
const js = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
window.scrollTo = () => {};
Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });

const errors = [];
window.addEventListener('error', e => errors.push(String(e.error || e.message)));
window.onerror = (m) => { errors.push(String(m)); };

window.eval(js);
await new Promise(r => setTimeout(r, 400));

const root$ = window.document.getElementById('root');
ok('app mounted', !!root$ && root$.textContent.trim().length > 0);

// --- store-level: seed8 ids actually landed in persisted state -----------------
// zustand/persist only flushes on a state change, so hydration alone leaves
// localStorage empty. Poke one real mutation first, then poll for the write.
// (Reading before this returns {} — and every content assertion below would then
// "pass" by filtering an empty array. That vacuous-pass shape is the whole reason
// this file exists, so it is guarded explicitly a few lines down.)
const nav = [...window.document.querySelectorAll('.nav-item')];
const goto = (re) => {
  const b = nav.find(n => re.test(n.textContent));
  if (b) b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return !!b;
};
// React reads value off the native setter, so assigning .value directly is ignored.
const setValue = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const clickText = (sel, re) => {
  const b = [...window.document.querySelectorAll(sel)].find(n => re.test(n.textContent));
  if (b) b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return !!b;
};

goto(/Email Templates/);
await new Promise(r => setTimeout(r, 250));
ok('New Template button opens the form', clickText('button', /New Template/));
await new Promise(r => setTimeout(r, 250));
const form = window.document.querySelector('.modal');
if (form) {
  setValue(form.querySelector('input'), 'VERIFY probe template');
  setValue(form.querySelector('textarea'), 'Probe body written by verify-templates.mjs.');
  clickText('.modal-actions button', /^Save$/);
  await new Promise(r => setTimeout(r, 300));
}
ok('form submit closed the modal', !window.document.querySelector('.modal'));
let persisted = {};
for (let i = 0; i < 40; i++) {
  persisted = JSON.parse(window.localStorage.getItem('job-tracker-pro-v2') || '{}');
  if (persisted?.state?.templates?.length) break;
  await new Promise(r => setTimeout(r, 50));
}
const templates = persisted?.state?.templates ?? [];
ok('persisted state readable', templates.length > 0, `${templates.length} templates persisted`);
const z04 = templates.filter(t => String(t.id).startsWith('z04-'));
ok('persist version bumped to 9', persisted.version === 9, `version=${persisted.version}`);
ok('47 seed8 templates in store', z04.length === 47, `found ${z04.length}`);
// 12 hand-written playbook templates + the probe this run just saved.
ok('playbook templates survived the merge',
  templates.length - z04.length === 13, `non-z04 = ${templates.length - z04.length}`);
ok('probe template really written', templates.some(t => t.name === 'VERIFY probe template'));
if (z04.length === 0) { console.log('\nABORT: no seed8 templates — content assertions would pass vacuously.'); process.exit(1); }

// --- content integrity: no truncated or empty bodies ---------------------------
const emptyBody = z04.filter(t => !t.body || t.body.trim().length < 120);
ok('no short/empty bodies', emptyBody.length === 0, emptyBody.map(t => t.id).join(',') || 'all ≥120 chars');
const noFields = z04.filter(t => !t.mergeFields || t.mergeFields.length === 0);
ok('every template has merge fields', noFields.length === 0, noFields.map(t => t.id).join(',') || 'all populated');
const unclosed = z04.filter(t => (t.body.match(/\{\{/g) || []).length !== (t.body.match(/\}\}/g) || []).length);
ok('no unbalanced merge-field braces', unclosed.length === 0, unclosed.map(t => t.id).join(',') || 'balanced');

// --- the privacy line: no real third-party addresses ---------------------------
// Placeholders are fine; a literal name@domain.tld that isn't a merge field is not.
const addrRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const leaked = [];
for (const t of z04) {
  for (const hit of (t.subject + '\n' + t.body).match(addrRe) || []) {
    if (!hit.includes('{{') && !hit.includes('}}')) leaked.push(`${t.id}: ${hit}`);
  }
}
ok('no literal email addresses in template text', leaked.length === 0, leaked.join(' | ') || 'all addresses are merge fields');

// --- LinkedIn notes must respect the 300-char field limit ----------------------
const over = z04.filter(t => t.id.startsWith('z04-i') && t.body.length > 300);
ok('LinkedIn connection notes ≤300 chars', over.length === 0,
  over.map(t => `${t.id}=${t.body.length}`).join(',') || 'all within limit');

// --- reply-rate claims are labelled, never asserted as our own -----------------
const rateTagged = z04.filter(t => (t.tags || []).some(x => String(x).startsWith('rate: ')));
ok('published reply rates carried as tags, not body claims', rateTagged.length > 20,
  `${rateTagged.length} templates tagged`);

// --- UI-level: navigate to Templates and count rendered cards ------------------
ok('Templates nav item exists', goto(/Email Templates/));
await new Promise(r => setTimeout(r, 300));
const text = root$.textContent;
ok('view reports the merged count', /60 templates/.test(text), (text.match(/\d+ templates/) || ['no count'])[0]);
ok('a seed8 template name is on screen', /A1 · /.test(text) || /C1 · /.test(text));

// Open a seed8 card's Preview and assert the research metadata is actually shown,
// not merely stored. Tags/scenario/merge fields only render inside the modal.
const cards = [...root$.querySelectorAll('.panel')];
const a1 = cards.find(c => /A1 · /.test(c.textContent));
ok('found the A1 card', !!a1);
const preview = a1 && [...a1.querySelectorAll('button')].find(b => /preview/i.test(b.textContent));
if (preview) preview.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 250));
const modalText = window.document.body.textContent;
ok('preview shows "When to use" scenario', /When to use:/.test(modalText));
ok('preview shows merge fields', /Merge fields \(\d+\)/.test(modalText));
ok('preview shows section + reply-rate tags',
  /Recruiter \/ TA cold/.test(modalText) && /rate: /.test(modalText));
ok('preview shows alternate subject lines', /Alternate subject lines/.test(modalText));

ok('zero runtime JS errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
