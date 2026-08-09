// Headless render verification for Job Tracker Pro v2
// Loads the built dist bundle in jsdom, clicks every nav item, reports errors + content stats.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = process.argv[2];
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: vc,
  resources: {
    // resolve local asset paths manually below
  },
});

const { window } = dom;
window.matchMedia = window.matchMedia || (q => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) window.crypto.randomUUID = () => 'id-' + Math.random().toString(36).slice(2);

// inject the built JS/CSS manually (jsdom won't fetch file-relative assets reliably)
const assetsDir = path.join(DIST, 'assets');
const jsFile = fs.readdirSync(assetsDir).find(f => f.endsWith('.js'));
const code = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

setTimeout(() => {
  try {
    window.eval(code);
  } catch (e) {
    errors.push('eval threw: ' + e.message);
  }

  (async () => {
    const tick = (ms = 120) => new Promise(r => setTimeout(r, ms));
    await tick(2500); // let React mount
    const doc = window.document;
    const navBtns = [...doc.querySelectorAll('.nav-item')];
    const results = [];

    for (const btn of navBtns) {
      const label = btn.textContent.trim();
      const before = errors.length;
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      await tick();
      const content = doc.querySelector('.content');
      const text = content ? content.textContent.trim() : '';
      results.push({
        nav: label,
        chars: text.length,
        nodes: content ? content.querySelectorAll('*').length : 0,
        newErrors: errors.length - before,
      });
    }

    console.log('=== NAV ITEMS FOUND: ' + navBtns.length + ' ===');
    for (const r of results) {
      const flag = r.newErrors > 0 ? ' *** ERRORS:' + r.newErrors : (r.chars < 80 ? ' *** THIN' : '');
      console.log(`${r.nav.padEnd(30)} chars=${String(r.chars).padStart(6)} nodes=${String(r.nodes).padStart(5)}${flag}`);
    }
    console.log('\n=== TOTAL JS ERRORS: ' + errors.length + ' ===');
    errors.slice(0, 12).forEach(e => console.log('  - ' + e.slice(0, 300)));

    // localStorage seed sanity
    try {
      const raw = window.localStorage.getItem('job-tracker-pro-v2');
      const st = raw ? JSON.parse(raw).state : null;
      if (st) {
        const c = k => Array.isArray(st[k]) ? st[k].length : (st[k] ? Object.keys(st[k]).length : 0);
        console.log('\n=== SEEDED STORE ===');
        ['jobs','companies','contacts','interviews','templates','questions','starStories','bullets','tasks','resumes','goals','savedSearches','outreach','offers','notes']
          .forEach(k => { if (st[k] !== undefined) console.log(`  ${k.padEnd(14)} ${c(k)}`); });
      } else {
        console.log('\n!!! no persisted store found');
      }
    } catch (e) { console.log('store read failed: ' + e.message); }

    const real = errors.filter(e => !/Could not load link/.test(e));
    console.log('\n=== NON-CSS ERRORS: ' + real.length + ' ===');
    process.exit(real.length > 0 ? 1 : 0);
  })();
}, 300);
