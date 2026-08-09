// Verification for the Action Board + CSV export (features added after the
// original verify-interact.cjs was written). Drives the real built bundle in
// jsdom: toggles a task, adds a task, and triggers the CSV export to inspect
// the actual Blob contents.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = process.argv[2] || 'dist';
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = e.message || String(e); if (!/Could not load link/.test(m)) errors.push('jsdomError: ' + m); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
const doc = window.document;
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
window.confirm = () => false;

// Capture anything the app tries to download.
const downloads = [];
window.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:captured/' + downloads.length; };
const origCreate = doc.createElement.bind(doc);
doc.createElement = (tag) => {
  const el = origCreate(tag);
  if (String(tag).toLowerCase() === 'a') el.click = function(){ downloads.at(-1).__name = this.download; };
  return el;
};

const assets = fs.readdirSync(path.join(DIST, 'assets'));
const js = assets.find(f => f.endsWith('.js'));
const s = doc.createElement('script');
s.textContent = fs.readFileSync(path.join(DIST, 'assets', js), 'utf8');
doc.body.appendChild(s);

const tick = () => new Promise(r => setTimeout(r, 60));
const $$ = sel => Array.from(doc.querySelectorAll(sel));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const byText = (sel, re) => $$(sel).find(e => re.test((e.textContent || '').trim()));

const results = [];
const check = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); };
const store = () => JSON.parse(window.localStorage.getItem('job-tracker-pro-v2') || '{}').state || {};

(async () => {
  await tick(); await tick();

  const nav = byText('.nav-item', /Action Board/);
  check('Action Board nav item exists', !!nav, nav ? nav.textContent.trim() : 'MISSING');
  if (!nav) return report();

  click(nav); await tick();

  const boxes = $$('.task-row input[type="checkbox"]');
  check('task rows render with checkboxes', boxes.length > 0, `${boxes.length} task rows`);

  // The persist middleware only writes on first mutation, so localStorage may
  // still be empty here. Take the baseline from what is actually on screen.
  const openBefore = boxes.filter(b => !b.checked).length;

  // Toggle the first task complete.
  if (boxes[0]) {
    boxes[0].click();
    await tick();
  }
  const afterTasks = store().tasks || [];
  const openAfter = afterTasks.filter(t => t.status !== 'done').length;
  check('checking a task marks it done and persists', openAfter === openBefore - 1,
    `open ${openBefore} -> ${openAfter}`);
  const doneOne = afterTasks.find(t => t.status === 'done');
  check('completed task gets a completedAt timestamp', !!(doneOne && doneOne.completedAt),
    doneOne ? String(doneOne.completedAt).slice(0, 19) : 'none');

  // Goals panel must show progress out of a target.
  const goalsPanel = $$('.panel').find(p => /Goals/.test(p.textContent || ''));
  check('goals panel renders with targets', !!goalsPanel && /\/\s*\d+/.test(goalsPanel.textContent),
    goalsPanel ? (goalsPanel.textContent.match(/\d+ \/ \d+/g) || []).join(' ') : 'MISSING');

  const ssPanel = $$('.panel').find(p => /Saved Searches/.test(p.textContent || ''));
  check('saved searches render', !!ssPanel && (store().savedSearches || []).length > 0,
    `${(store().savedSearches || []).length} saved searches`);

  // --- CSV export from Settings ---
  const setNav = byText('.nav-item', /Settings/);
  click(setNav); await tick();
  const csvBtn = byText('button', /Export pipeline CSV/);
  check('CSV export button exists', !!csvBtn);
  if (csvBtn) {
    click(csvBtn); await tick();
    const blob = downloads.at(-1);
    const text = blob ? await blob.text() : '';
    const lines = text.trim().split('\n');
    const jobCount = (store().jobs || []).length;
    check('CSV downloaded with one row per job', lines.length === jobCount + 1,
      `${lines.length - 1} data rows for ${jobCount} jobs`);
    check('CSV header is correct', /^﻿?Company,Title,Status,Priority,Fit/.test(lines[0]),
      lines[0] ? lines[0].slice(0, 60) : 'EMPTY');
    const commaSafe = lines.slice(1).every(l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).length === 12);
    check('every CSV row has 12 properly-quoted fields', commaSafe);
    check('CSV filename set', blob && /^job-pipeline-\d{4}-\d{2}-\d{2}\.csv$/.test(blob.__name || ''),
      blob ? blob.__name : 'none');
  }

  check('no uncaught JS errors', errors.length === 0, errors.join(' | ') || 'clean');
  report();
})();

function report() {
  let pass = 0;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
    if (r.ok) pass++;
  }
  console.log(`\n=== ${pass}/${results.length} checks passed ===`);
  process.exit(pass === results.length ? 0 : 1);
}
