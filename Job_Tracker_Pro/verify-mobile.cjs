/* Mobile drawer + touch-layout checks against the built bundle.
 *
 * jsdom does not evaluate media queries, so this cannot prove the drawer is
 * *visible* at 375px. What it can prove is the part that actually broke things
 * in every hand-rolled responsive nav I have seen:
 *   - the toggle exists in the same DOM at every width (no conditional render),
 *   - opening it marks the sidebar and paints a scrim,
 *   - choosing a destination closes it (otherwise you tap through to nothing),
 *   - Escape and the scrim both close it,
 *   - the drawer is announced to assistive tech (aria-expanded / aria-controls).
 * The CSS side is asserted separately by reading the stylesheet: the breakpoint,
 * the transform, and the 16px input rule that stops iOS zooming on focus.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = process.argv[2] || path.join(__dirname, 'dist');
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
};

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) window.crypto.randomUUID = () => 'id-' + Math.random().toString(36).slice(2);

const assetsDir = path.join(DIST, 'assets');
const jsFile = fs.readdirSync(assetsDir).find(f => f.endsWith('.js'));
const cssFile = fs.readdirSync(assetsDir).find(f => f.endsWith('.css'));
const code = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

const tick = (ms = 140) => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

setTimeout(async () => {
  try { window.eval(code); } catch (e) { errors.push('eval threw: ' + e.message); }
  await tick(2500);
  const doc = window.document;

  // ---- stylesheet contract ----
  ok('a small-screen breakpoint exists', /@media\s*\(max-width:\s*820px\)/.test(css), '820px');
  // esbuild rewrites translateX(-100%) to the shorthand translate(-100%), so the
  // assertion has to match the built form, not the form I typed.
  const flat = css.replace(/\s+/g, '');
  ok('the sidebar becomes an off-canvas drawer',
    /\.sidebar\{[^}]*position:fixed[^}]*transform:translate(X)?\(-100%\)/.test(flat));
  ok('opening it slides the drawer back in',
    /\.sidebar\.open\{[^}]*transform:translate(X)?\(0\)/.test(flat));
  ok('form controls are 16px on small screens (stops iOS zoom)',
    /\.toolbarselect,\.toolbarinput\{font-size:16px\}/.test(flat));
  ok('layout uses dvh so iOS chrome does not clip the last row', /100dvh/.test(css));
  // Without min-width:0 the flex/grid children keep their desktop min-content
  // width and the media queries have no visible effect. This was a real bug:
  // every dashboard panel measured 1296px wide inside a 390px viewport.
  ok('the main column may shrink below its content', /\.main\{[^}]*min-width:0/.test(flat));
  ok('grid and panel children may shrink too', /\.grid>\*,\.kpi-row>\*,\.panel\{min-width:0\}/.test(flat));
  ok('nothing scrolls the page sideways on small screens', /\.content\{overflow-x:hidden\}/.test(flat));
  ok('reduced-motion is respected', /prefers-reduced-motion/.test(css));
  ok('keyboard focus is visible', /:focus-visible/.test(css));

  // ---- drawer behaviour ----
  const toggle = doc.querySelector('.nav-toggle');
  ok('the menu toggle is in the DOM at every width', !!toggle);
  if (!toggle) { console.log(`\n${pass} passed / ${fail} failed`); process.exit(1); }

  ok('the toggle names itself for screen readers', !!toggle.getAttribute('aria-label'), toggle.getAttribute('aria-label') || '');
  ok('the toggle points at the nav it controls', toggle.getAttribute('aria-controls') === 'app-nav');
  ok('the drawer starts closed', toggle.getAttribute('aria-expanded') === 'false' && !doc.querySelector('.sidebar.open'));
  ok('no scrim before opening', !doc.querySelector('.scrim'));

  click(toggle); await tick();
  ok('tapping the toggle opens the drawer', !!doc.querySelector('.sidebar.open'));
  ok('aria-expanded follows the drawer', doc.querySelector('.nav-toggle').getAttribute('aria-expanded') === 'true');
  ok('a scrim covers the content while open', !!doc.querySelector('.scrim'));
  ok('the scrim is hidden from assistive tech', doc.querySelector('.scrim').getAttribute('aria-hidden') === 'true');

  click(doc.querySelector('.scrim')); await tick();
  ok('tapping outside closes the drawer', !doc.querySelector('.sidebar.open') && !doc.querySelector('.scrim'));

  click(doc.querySelector('.nav-toggle')); await tick();
  const target = [...doc.querySelectorAll('.nav-item')].find(b => b.textContent.includes('Pipeline'));
  ok('nav items are reachable while the drawer is open', !!target);
  click(target); await tick(220);
  ok('picking a destination closes the drawer', !doc.querySelector('.sidebar.open'));
  ok('and actually navigates', /Pipeline/.test(doc.querySelector('.topbar .title')?.textContent || ''), doc.querySelector('.topbar .title')?.textContent || '');
  ok('the active item is marked for assistive tech',
    !!doc.querySelector('.nav-item[aria-current="page"]'),
    doc.querySelector('.nav-item[aria-current="page"]')?.textContent.trim() || 'none');

  click(doc.querySelector('.nav-toggle')); await tick();
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  ok('Escape closes the drawer', !doc.querySelector('.sidebar.open'));

  const real = errors.filter(e => !/Could not load link/.test(e));
  ok('no runtime JS errors', real.length === 0, real.slice(0, 2).join(' | ') || 'clean');

  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 300);
