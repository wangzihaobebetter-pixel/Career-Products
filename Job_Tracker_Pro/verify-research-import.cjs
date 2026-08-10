// Research-import verification, end to end, against the real built bundle.
//
// Why this exists: tools/reports-to-research.mjs turns 76 Chinese-language
// research reports into an import file. A parser change that quietly stops
// producing rows the app recognises would look fine in the parser's own stats
// and produce an empty import in the app. This drives the actual UI path —
// Settings -> Import research JSON -> preview -> confirm -> pipeline grew —
// so the parser and the app's acceptance rules are checked against each other.
//
// Usage: node verify-research-import.cjs [dist] [research.json]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = process.argv[2] || 'dist';
const RESEARCH = process.argv[3]
  || path.join(os.homedir(), 'Desktop', 'Open claw', 'Career Products', 'research-import-latest.json');

let pass = 0, fail = 0;
const ok = (name, detail) => { pass++; console.log(`PASS  ${name}${detail ? '  — ' + detail : ''}`); };
const bad = (name, detail) => { fail++; console.log(`FAIL  ${name}${detail ? '  — ' + detail : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name, detail) : bad(name, detail));

if (!fs.existsSync(RESEARCH)) {
  console.log(`SKIP  research file not found: ${RESEARCH}`);
  console.log('      run: node tools/reports-to-research.mjs');
  process.exit(0);
}
const researchText = fs.readFileSync(RESEARCH, 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = e.message || String(e); if (!/Could not load link/.test(m)) errors.push('jsdomError: ' + m); });
vc.on('error', (...a) => { const s = a.join(' '); if (!/not wrapped in act|validateDOMNesting/.test(s)) errors.push('console.error: ' + s); });

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
const doc = window.document;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
window.confirm = () => true;
window.alert = () => {};

/* The app opens a real <input type="file">. Hand it our file and fire the
   change handler the moment it is clicked, which is what a user picking a
   file does. */
const origCreate = doc.createElement.bind(doc);
let filePicked = false;
doc.createElement = (tag, ...rest) => {
  const el = origCreate(tag, ...rest);
  if (String(tag).toLowerCase() === 'input') {
    el.click = () => {
      if (el.type !== 'file') return;
      Object.defineProperty(el, 'files', {
        configurable: true,
        value: [{ name: path.basename(RESEARCH), text: async () => researchText }],
      });
      filePicked = true;
      if (typeof el.onchange === 'function') el.onchange(new window.Event('change'));
    };
  }
  return el;
};

/* jsdom will not fetch the bundle referenced by <script src>, so inject it the
   way the other verify harnesses do — same built file the browser loads. */
const jsAsset = fs.readdirSync(path.join(DIST, 'assets')).find(f => f.endsWith('.js'));
const scriptEl = origCreate('script');
scriptEl.textContent = fs.readFileSync(path.join(DIST, 'assets', jsAsset), 'utf8');
doc.body.appendChild(scriptEl);

const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
/* Read only the rendered app. doc.body also holds the injected bundle's source
   text, and matching against that produced a false pass. */
const text = () => ((doc.querySelector('#root') || doc.body).textContent || '').replace(/\s+/g, ' ');

/* Pipeline's sidebar badge is the job count, and it is available before the
   store has persisted anything. */
const navJobCount = () => {
  const el = [...doc.querySelectorAll('#root button, #root a')].find(e => /Pipeline/.test(e.textContent || ''));
  const m = (el?.textContent || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
};
const findByText = (sel, re) => [...doc.querySelectorAll(sel)].find(e => re.test(e.textContent || ''));
const click = (el) => el && el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

const readStore = () => {
  const raw = window.localStorage.getItem('job-tracker-pro-v2');
  if (!raw) return null;
  const p = JSON.parse(raw);
  return p.state || p;
};

(async () => {
  await wait(700);

  const parsed = JSON.parse(researchText);
  check(Array.isArray(parsed.jobs) && parsed.jobs.length > 0,
    'research file has roles', `${parsed.jobs?.length ?? 0} roles`);
  check(Array.isArray(parsed.companies) && parsed.companies.length > 0,
    'research file has companies', `${parsed.companies?.length ?? 0} companies`);

  const urls = parsed.jobs.filter(j => j.applyUrl);
  check(urls.length >= 100, 'a substantial share of roles carry an apply URL',
    `${urls.length} of ${parsed.jobs.length}`);
  check(urls.every(j => /^https?:\/\//.test(j.applyUrl)),
    'every apply URL is a real absolute URL');
  check(parsed.jobs.every(j => j.company && j.title),
    'every role has both a company and a title');
  // Contamination the parser is meant to strip; a regression shows up here.
  const dirty = parsed.jobs.filter(j => /[一-龥]|\$|\d{4}/.test(j.title));
  check(dirty.length === 0, 'no role title carries prose, currency or counts',
    dirty.length ? dirty.slice(0, 3).map(d => d.title).join(' / ') : 'clean');

  const beforeJobs = navJobCount();
  check(beforeJobs !== null && beforeJobs > 0, 'app mounted with seeded jobs',
    beforeJobs === null ? 'Pipeline badge not found' : `${beforeJobs} jobs`);

  const settingsNav = findByText('#root button, #root a', /Settings/);
  click(settingsNav);
  await wait(300);
  check(/Import research JSON/.test(text()), 'Settings exposes the research import');

  const btn = findByText('#root button', /Import research JSON/);
  click(btn);
  await wait(600);
  check(filePicked, 'file picker received the research file');

  const afterPick = text();
  check(!/Import rejected|Invalid JSON/.test(afterPick),
    'the app accepted the generated file',
    /✗ ([^·]{0,80})/.test(afterPick) ? RegExp.$1 : 'no rejection message');
  check(/Review research import/i.test(afterPick) && /nothing is\s+saved until you press Import/i.test(afterPick),
    'preview opened before anything was committed');

  check(navJobCount() === beforeJobs,
    'preview alone changes nothing', `${beforeJobs} -> ${navJobCount()} jobs`);

  const confirmBtn = [...doc.querySelectorAll('#root button')]
    .find(b => /^(import|confirm|add)/i.test((b.textContent || '').trim()));
  check(!!confirmBtn, 'preview has a confirm control',
    confirmBtn ? `"${confirmBtn.textContent.trim().slice(0, 40)}"` : 'none found');
  click(confirmBtn);
  await wait(800);

  const after = readStore();
  check(!!after, 'import persisted the store to localStorage');
  const afterJobs = navJobCount();
  check(afterJobs > beforeJobs,
    'confirming actually added roles to the pipeline',
    `${beforeJobs} -> ${afterJobs} jobs`);
  check(after.companies.length >= 22,
    'company records survived the import', `${after.companies.length} companies`);

  const added = after.jobs.slice(beforeJobs);
  check(added.every(j => j.status === 'wishlist'),
    'imported roles land in Wishlist, not marked as applied',
    `${added.length} imported`);
  check(added.every(j => j.companyId && after.companies.some(c => c.id === j.companyId)),
    'every imported role resolves to a real company record');

  click(findByText('#root button, #root a', /Pipeline/));
  await wait(400);
  check(/Pipeline/.test(text()), 'pipeline still renders after the import');

  check(errors.length === 0, 'no uncaught JS errors', errors.slice(0, 2).join(' | ') || 'clean');

  console.log(`\n=== ${pass}/${pass + fail} checks passed ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('harness crashed:', e); process.exit(1); });
