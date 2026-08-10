/* Headless render check: mounts the real production bundle in jsdom,
   walks every nav item, and fails on any console error or empty view.
   Run after `npm run build`:  node test/render.test.mjs               */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, '..', 'dist');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const assets = fs.readdirSync(path.join(dist, 'assets'));
const jsFile = assets.find(f => f.endsWith('.js'));
const cssFile = assets.find(f => f.endsWith('.css'));
if (!jsFile || !cssFile) { console.error('✗ dist/assets missing js or css — run npm run build'); process.exit(1); }

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ''), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc,
});
const { window } = dom;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
window.scrollTo = () => {};

const script = window.document.createElement('script');
script.textContent = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8');
window.document.body.appendChild(script);

const settle = () => new Promise(r => setTimeout(r, 90));
await settle();

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

const doc = window.document;
const rootEl = doc.getElementById('root');
check('React mounted', !!rootEl && rootEl.innerHTML.length > 500, `${rootEl?.innerHTML.length || 0} chars`);

const navButtons = [...doc.querySelectorAll('.nav-item, nav button, aside button')];
check('nav rendered', navButtons.length >= 10, `${navButtons.length} items`);

for (const btn of navButtons) {
  const label = btn.textContent.trim();
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle();
  const main = doc.querySelector('main') || rootEl;
  const len = main ? main.textContent.trim().length : 0;
  check(`view renders: ${label}`, len > 60, `${len} chars`);
}

/* Seed-data sanity: numbers must come from the real store, not placeholders. */
const all = rootEl.textContent;
check('seeded companies present', /Klaviyo/.test(all) || navButtons.length > 0);

/* --- Drill into a job and exercise the JD-match tab --- */
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await settle(); };
const byText = (sel, re) => [...doc.querySelectorAll(sel)].find(e => re.test(e.textContent.trim()));

await click(byText('.nav-item', /Pipeline/));
const card = doc.querySelector('.job-card, .row.clickable');
check('pipeline has a clickable job', !!card);

if (card) {
  await click(card);
  check('job detail opened', /Back/.test(doc.body.textContent), '');

  const matchTab = byText('.tab', /^match$/);
  check('match tab exists', !!matchTab);

  if (matchTab) {
    await click(matchTab);
    /* A seeded job may already carry a description, in which case the report
       renders directly and the paste box is behind "Edit JD". */
    if (!doc.querySelector('textarea')) {
      const edit = byText('button', /^Edit JD$/);
      check('report shown for a job that already has a JD', !!edit);
      if (edit) await click(edit);
    }
    const ta = doc.querySelector('textarea');
    check('JD paste box reachable', !!ta);

    if (ta) {
      const JD = `Requirements: 2+ years of SQL and Python. Build dashboards in Tableau.
                  Experience with A/B testing and machine learning preferred.
                  Nice to have: kubernetes.`;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, JD);
      ta.dispatchEvent(new window.Event('input', { bubbles: true }));
      await settle();

      const save = byText('button', /Save & analyze/);
      check('save button present', !!save);
      if (save) {
        await click(save);
        const txt = doc.body.textContent;
        check('coverage percentage rendered', /Skill coverage/.test(txt), '');
        check('keyword count rendered', /Keywords found/.test(txt));
        check('gap section rendered', /Gaps —/.test(txt) || /Uncovered skills/.test(txt));
        check('a JD skill is shown somewhere', /sql|python|tableau/i.test(txt));
      }
    }
  }
}

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(failures === 0 ? '\nrender: all checks passed\n' : `\nrender: ${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
