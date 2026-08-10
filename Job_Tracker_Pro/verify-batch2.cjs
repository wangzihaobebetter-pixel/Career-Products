/* verify-batch2.cjs
   Guards the batch-2 employer question bank (src/seed7.ts, salvaged from the
   burn-r2-04 research run) all the way through to the rendered Interview Prep
   view — not just its presence in the bundle.

   Two things this exists to catch:
     1. A seed file that compiles but is never wired into the store, so the
        questions exist on disk and nowhere the user can reach them.
     2. Coach advice losing its "unverified" marker. That advice is model
        commentary containing specific-sounding claims (alumni head counts and
        the like). If the marker is ever stripped it starts reading as sourced
        fact, which is exactly how someone ends up repeating it in an interview.
*/
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIST = path.join(__dirname, 'dist');
const SEED = path.join(__dirname, 'src', 'seed7.ts');

// Every employer the batch-2 report covered. Missing one means the parse that
// generated seed7 silently dropped a section.
const EMPLOYERS = [
  'Wayfair', 'HubSpot', 'Toast', 'DraftKings', 'CarGurus', 'Chewy',
  'Rapid7', 'Flywire', 'ZoomInfo', 'Iterable', 'Starburst Data', 'Snyk',
];

let pass = 0, fail = 0;
const ok = (n, d) => { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); };
const bad = (n, d) => { fail++; console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`); };
const check = (n, cond, d) => (cond ? ok(n, d) : bad(n, d));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const settle = (ms = 260) => sleep(ms);

(async () => {
  // --- source-level guards ---------------------------------------------------
  const seed = fs.readFileSync(SEED, 'utf8');
  // Employer slugs can contain digits (rapid7), so the id pattern must too —
  // an [a-z]+ slug silently drops a whole company from the count.
  const ids = [...seed.matchAll(/q\('(qr204_[a-z0-9]+_\d+)'/g)].map(m => m[1]);
  check('seed7 exports a non-trivial bank', ids.length >= 90, `${ids.length} questions`);
  check('no duplicate question ids', new Set(ids).size === ids.length,
    `${new Set(ids).size} unique of ${ids.length}`);

  const graded = (seed.match(/（(?:一手抓取|论坛\/聚合转述|推断) \[[ABC]\]）/g) || []).length;
  check('every question carries a confidence grade', graded === ids.length,
    `${graded} graded of ${ids.length}`);

  const coachBlocks = (seed.match(/教练建议（M3 生成，未经核实/g) || []).length;
  check('coach advice is present and marked unverified', coachBlocks > 0,
    `${coachBlocks} company notes`);
  check('coach advice appears at most once per employer', coachBlocks <= EMPLOYERS.length,
    `${coachBlocks} blocks for ${EMPLOYERS.length} employers`);

  // --- wiring guard ----------------------------------------------------------
  const store = fs.readFileSync(path.join(__dirname, 'src', 'store.ts'), 'utf8');
  check('store imports the batch-2 bank', /from '\.\/seed7'/.test(store));
  check('batch-2 bank is merged into the seeded questions',
    /questions: \[[\s\S]{0,200}batch2Questions/.test(store));
  // Name-agnostic: the migration must filter the batch-2 bank by ids the stored
  // state already has, so an upgrade adds questions instead of rebuilding them.
  check('the persist migration also back-fills existing stores',
    /batch2Questions\][\s\S]{0,80}filter\(q => !\w+\.has\(q\.id\)\)/.test(store));

  // --- rendered guards -------------------------------------------------------
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const jsFile = fs.readdirSync(path.join(DIST, 'assets')).find(f => f.endsWith('.js'));
  const code = fs.readFileSync(path.join(DIST, 'assets', jsFile), 'utf8');
  check('built bundle actually contains the batch-2 ids', code.includes(ids[0]), ids[0]);

  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  window.addEventListener('error', e => errors.push(String(e.error || e.message)));
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
  window.scrollTo = () => {};
  try { window.eval(code); } catch (e) { console.error('bundle threw:', e); process.exit(1); }
  await settle(400);

  const doc = window.document;
  const $$ = (s) => [...doc.querySelectorAll(s)];
  const click = async (el) => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await settle();
  };

  const nav = $$('a, button').find(el => /Interview Prep/i.test(el.textContent || ''));
  if (!nav) { console.error('no Interview Prep nav item'); process.exit(1); }
  await click(nav);

  const companySel = $$('select').find(s => /All companies/.test(s.textContent || ''));
  check('company filter is rendered', !!companySel);

  if (companySel) {
    const options = [...companySel.options].map(o => o.value);
    const missing = EMPLOYERS.filter(c => !options.includes(c));
    check('all 12 batch-2 employers reached the company filter', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')}` : `${EMPLOYERS.length}/12 present`);

    // Spot-check an employer that only batch-2 introduced, so a pass cannot be
    // explained by the older seed banks already covering the name.
    const opt = [...companySel.options].find(o => o.value === 'Starburst Data');
    if (opt) {
      companySel.value = 'Starburst Data';
      companySel.dispatchEvent(new window.Event('change', { bubbles: true }));
      await settle();
      const cards = $$('[data-testid="q-card"]');
      check('filtering to a batch-2-only employer returns its questions', cards.length > 0,
        `${cards.length} cards`);
      check('those cards really are that employer\'s',
        cards.every(c => /Starburst/.test(c.textContent || '')));
      check('the questions carry their provenance into the UI',
        cards.some(c => /BurnR2_04/.test(c.textContent || '')));
    } else {
      bad('Starburst Data present in the company filter');
    }
  }

  check('no uncaught JS errors', errors.filter(e => !/css/i.test(e)).length === 0,
    errors.length ? errors.join(' | ') : 'clean');

  console.log(`\n=== ${pass}/${pass + fail} checks passed ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
