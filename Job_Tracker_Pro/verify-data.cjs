// Data inventory verification for Job Tracker Pro v2.
// Mounts the built bundle in jsdom, forces one store mutation so zustand's
// `persist` flushes, then reports the real per-entity counts from localStorage.
// Used to make truthful claims about what is actually seeded in the app.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = process.argv[2] || path.join(__dirname, 'dist');
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = e.message || String(e); if (!/Could not load link/.test(m)) errors.push('jsdomError: ' + m); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
const doc = window.document;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) window.crypto.randomUUID = () => 'id-' + Math.random().toString(36).slice(2);

const assets = fs.readdirSync(path.join(DIST, 'assets'));
const js = assets.find(f => f.endsWith('.js'));
const s = doc.createElement('script');
s.textContent = fs.readFileSync(path.join(DIST, 'assets', js), 'utf8');
doc.body.appendChild(s);

const tick = () => new Promise(r => setTimeout(r, 60));
const $$ = sel => Array.from(doc.querySelectorAll(sel));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

const STORE_KEY = 'job-tracker-pro-v2';

(async () => {
  await tick(); await tick();

  // zustand persist writes lazily; toggling the theme is the cheapest mutation
  // that forces a flush without polluting the entity collections.
  const themeBtn = $$('button').find(b => /theme|主题|🌙|☀️/i.test(b.textContent || b.getAttribute('aria-label') || b.title || ''));
  if (themeBtn) { click(themeBtn); await tick(); }
  if (!window.localStorage.getItem(STORE_KEY)) {
    // fall back: navigate views, some views record activity on mount
    for (const n of $$('.nav-item')) { click(n); await tick(); }
  }

  const raw = window.localStorage.getItem(STORE_KEY);
  let empty = [];
  if (!raw) {
    console.log('NOTE  store not flushed (no mutation yet) — reporting rendered DOM only');
  } else {
    const st = JSON.parse(raw).state;
    const COLLECTIONS = ['jobs', 'companies', 'contacts', 'interviews', 'templates', 'questions', 'stories', 'starStories', 'resumes', 'bullets', 'tasks', 'notes', 'goals', 'savedSearches', 'offers', 'outreach', 'activity'];
    console.log('=== seeded data inventory ===');
    for (const k of COLLECTIONS) {
      const v = st[k];
      if (v === undefined) continue;
      const n = Array.isArray(v) ? v.length : (typeof v === 'object' ? Object.keys(v).length : 1);
      console.log(String(n).padStart(5) + '  ' + k);
      if (n === 0) empty.push(k);
    }
  }

  // per-view rendered row counts
  console.log('=== rendered rows per view ===');
  for (const n of $$('.nav-item')) {
    const label = (n.textContent || '').trim();
    click(n); await tick(); await tick();
    const main = doc.querySelector('main') || doc.body;
    const rows = main.querySelectorAll('.row, .panel, .kpi, [class*="card"], tbody tr').length;
    const text = (main.textContent || '').replace(/\s+/g, ' ').trim();
    console.log(String(rows).padStart(5) + '  ' + label + '  | ' + text.length + ' chars | ' + text.slice(0, 70));
  }

  console.log('=== empty collections: ' + (empty.length ? empty.join(', ') : 'none') + ' ===');
  console.log('=== js errors: ' + errors.length + ' ===');
  errors.slice(0, 5).forEach(e => console.log('  ' + e));
})();
