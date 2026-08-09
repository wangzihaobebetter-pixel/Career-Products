/**
 * Headless render verification for Job Tracker Pro.
 * Loads the production bundle in jsdom, waits for React to mount,
 * then asserts that every navigation view renders real seeded data.
 *
 * Run:  node verify-render.mjs
 * Exit: 0 = all checks pass, 1 = at least one check failed.
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, 'dist');

const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const assetDir = path.join(distDir, 'assets');
const jsFile = fs.readdirSync(assetDir).find((f) => f.endsWith('.js'));
const cssFile = fs.readdirSync(assetDir).find((f) => f.endsWith('.css'));
const bundle = fs.readFileSync(path.join(assetDir, jsFile), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ''), {
  runScripts: 'dangerously',
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
  virtualConsole: vc,
});

const { window } = dom;
window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, onchange: null,
  addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
}));
window.scrollTo = () => {};

const script = window.document.createElement('script');
script.type = 'module';
script.textContent = bundle;
window.document.body.appendChild(script);

// The bundle is ESM; jsdom executes module scripts asynchronously.
// Fall back to evaluating it as a classic script if #root stays empty.
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
await settle(300);
if (!window.document.getElementById('root').children.length) {
  window.eval(bundle);
  await settle(500);
}

const doc = window.document;
const txt = () => doc.getElementById('root').textContent || '';
const results = [];
const check = (name, cond, detail) => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const navButtons = [...doc.querySelectorAll('.nav-item')];
const click = async (el) => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle(120);
};

check('React mounted', doc.getElementById('root').children.length > 0);
check('sidebar nav rendered', navButtons.length === 10, `${navButtons.length} nav items`);
check('css asset emitted', !!cssFile, cssFile);

// Dashboard (default view)
check('Dashboard has KPI tiles', doc.querySelectorAll('.kpi, .kpi-card, .stat-tile').length >= 3,
  `${doc.querySelectorAll('.kpi, .kpi-card, .stat-tile').length} tiles`);

// Walk every nav view and confirm it renders non-trivial content
const seen = {};
for (const btn of navButtons) {
  const label = btn.textContent.replace(/^\W+/, '').replace(/\d+$/, '').trim();
  await click(btn);
  const body = doc.querySelector('.content');
  const len = (body?.textContent || '').trim().length;
  seen[label] = len;
  check(`view renders: ${label}`, len > 120, `${len} chars`);
}

// Data integrity — seeded research data must be present
await click(navButtons[1]); // Pipeline
const pipeText = doc.querySelector('.content').textContent;
check('Pipeline shows seeded roles', /Klaviyo|DraftKings|CarGurus|Notion/.test(pipeText));

await click(navButtons[2]); // Companies
const compCards = doc.querySelectorAll('.grid .panel').length;
check('Companies list populated', compCards >= 10, `${compCards} cards`);

await click(navButtons[5]); // Resume & Bullets
const resumeText = doc.querySelector('.content').textContent;
check('Bullet library populated', resumeText.length > 500, `${resumeText.length} chars`);

await click(navButtons[6]); // Email Templates
const tplText = doc.querySelector('.content').textContent;
check('Template library populated', /outreach|referral|follow|thank/i.test(tplText), `${tplText.length} chars`);

await click(navButtons[7]); // Interview Prep
const prepText = doc.querySelector('.content').textContent;
check('Question bank populated', /Klaviyo|resume|SQL|weakness/i.test(prepText), `${prepText.length} chars`);

await click(navButtons[3]); // Contacts
const contactText = doc.querySelector('.content').textContent;
check('Contact slots seeded', contactText.length > 200, `${contactText.length} chars`);

check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
