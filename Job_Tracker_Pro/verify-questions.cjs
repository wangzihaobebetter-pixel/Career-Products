/* verify-questions.cjs
   Guards the Interview Prep view against the regression it was just fixed for:
   the mined bank is ~900 questions, and rendering all of them at once froze
   the view on every keystroke. Asserts paging, filtering and debounced search
   against the real production bundle. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIST = path.join(__dirname, 'dist');
const PAGE_SIZE = 60;

let pass = 0, fail = 0;
const ok = (name, detail) => { pass++; console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); };
const bad = (name, detail) => { fail++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); };
const check = (name, cond, detail) => (cond ? ok(name, detail) : bad(name, detail));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// React commits on a microtask; give it a macrotask plus the 180ms debounce.
const settle = async (ms = 260) => { await sleep(ms); };

(async () => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const assets = fs.readdirSync(path.join(DIST, 'assets'));
  const js = assets.find(f => f.endsWith('.js'));
  const code = fs.readFileSync(path.join(DIST, 'assets', js), 'utf8');

  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  const { window } = dom;
  window.addEventListener('error', e => errors.push(String(e.error || e.message)));
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
  window.scrollTo = () => {};

  try { window.eval(code); } catch (e) { console.error('bundle threw:', e); process.exit(1); }
  await settle(400);

  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => [...doc.querySelectorAll(s)];
  const click = async (el) => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await settle();
  };

  // --- navigate to Interview Prep -------------------------------------------
  const navLink = $$('a, button').find(el => /Interview Prep/i.test(el.textContent || ''));
  if (!navLink) { console.error('could not find the Interview Prep nav item'); process.exit(1); }
  await click(navLink);

  const cards = () => $$('[data-testid="q-card"]');
  const countLabel = () => ($('[data-testid="q-count"]') || {}).textContent || '';

  check('Interview Prep renders question cards', cards().length > 0, `${cards().length} cards`);

  const total = parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || '0', 10);
  check('the bank is large enough for paging to matter', total > PAGE_SIZE, `${total} questions in bank`);

  // --- the actual regression guard ------------------------------------------
  check(
    'first page renders at most one page of cards, not the whole bank',
    cards().length <= PAGE_SIZE,
    `${cards().length} rendered vs ${total} in bank`,
  );
  check('count label shows a range, not just a total', /^\d+–\d+ of \d+$/.test(countLabel().trim()), countLabel().trim());

  // --- paging ---------------------------------------------------------------
  const firstPageText = cards().map(c => c.textContent).join('|');
  const next = $('[data-testid="q-next"]');
  check('a pager is rendered when the bank overflows one page', !!next);
  if (next) {
    await click(next);
    const secondPageText = cards().map(c => c.textContent).join('|');
    check('Next advances to different questions', secondPageText !== firstPageText);
    check('page 2 also stays within one page', cards().length <= PAGE_SIZE, `${cards().length} cards`);
    check('count label advanced', /^61–/.test(countLabel().trim()), countLabel().trim());

    const prev = $$('[data-testid="q-pager"] button').find(b => /Prev/.test(b.textContent || ''));
    await click(prev);
    check('Prev returns to the first page', cards().map(c => c.textContent).join('|') === firstPageText);
  }

  // --- company filter -------------------------------------------------------
  const selects = $$('select');
  const companySel = selects.find(s => /All companies/.test(s.textContent || ''));
  check('company filter exists', !!companySel);
  if (companySel) {
    const opt = [...companySel.options].find(o => o.value && /\(\d+\)/.test(o.textContent));
    const expected = parseInt((opt.textContent.match(/\((\d+)\)/) || [])[1], 10);
    companySel.value = opt.value;
    companySel.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
    const shownTotal = parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || String(cards().length), 10);
    check(
      'company filter narrows the bank to that company\'s count',
      shownTotal === expected || cards().length === expected,
      `${opt.value}: expected ${expected}, got ${shownTotal || cards().length}`,
    );
    check('every visible card belongs to the filtered company',
      cards().every(c => c.textContent.includes(opt.value)),
      opt.value);
    companySel.value = '';
    companySel.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
  }

  // --- filter change resets paging -----------------------------------------
  const next2 = $('[data-testid="q-next"]');
  if (next2) {
    await click(next2);
    const before = countLabel().trim();
    const typeSel = selects.find(s => /All types/.test(s.textContent || ''));
    if (typeSel) {
      typeSel.value = 'behavioral';
      typeSel.dispatchEvent(new window.Event('change', { bubbles: true }));
      await settle();
      check('changing a filter resets you to page 1',
        /^1–/.test(countLabel().trim()),
        `was "${before}", now "${countLabel().trim()}"`);
      typeSel.value = '';
      typeSel.dispatchEvent(new window.Event('change', { bubbles: true }));
      await settle();
    }
  }

  // --- debounced search -----------------------------------------------------
  const search = $$('input.search').find(i => /Search/i.test(i.placeholder || ''));
  check('search input exists', !!search);
  if (search) {
    const beforeTotal = parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || '0', 10);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(search, 'SQL');
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    // Before the debounce fires the list must NOT have re-filtered yet.
    await sleep(40);
    const midTotal = parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || '0', 10);
    check('search is debounced (list unchanged 40ms after keystroke)', midTotal === beforeTotal,
      `${beforeTotal} → ${midTotal}`);
    await settle(320);
    const afterTotal = parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || '0', 10);
    check('search narrows the bank after the debounce', afterTotal > 0 && afterTotal < beforeTotal,
      `${beforeTotal} → ${afterTotal} for "SQL"`);
    check('search results still respect the page cap', cards().length <= PAGE_SIZE, `${cards().length} cards`);

    setter.call(search, 'zzzzznotarealquestionzzzzz');
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    await settle(320);
    check('a no-match search shows the empty state, not a blank grid',
      /No questions match/i.test(doc.body.textContent || ''));

    setter.call(search, '');
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    await settle(320);
    check('clearing the search restores the full bank',
      parseInt((countLabel().match(/of\s+(\d+)/) || [])[1] || '0', 10) === total);
  }

  // --- STAR stories tab still works ----------------------------------------
  const storiesTab = $$('button').find(b => /STAR Stories/.test(b.textContent || ''));
  check('STAR Stories tab exists', !!storiesTab);
  if (storiesTab) {
    await click(storiesTab);
    check('STAR Stories tab renders content', (doc.body.textContent || '').length > 500);
    check('pager is hidden on the stories tab', !$('[data-testid="q-pager"]'));
  }

  const real = errors.filter(e => !/Could not parse CSS|cssRules|getComputedStyle/i.test(e));
  check('no uncaught JS errors', real.length === 0, real.slice(0, 3).join(' | ') || 'clean');

  console.log(`\n=== questions: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
