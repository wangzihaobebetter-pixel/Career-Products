// Backup round-trip verification.
//
// Why this exists: loadBackup() copies a hand-written allow-list of keys, and
// one of them was misspelled ('stories' instead of 'starStories'). Export
// still wrote the STAR stories, import silently dropped them, and every other
// suite passed — because nothing ever exercised export -> import. This drives
// the real built bundle: exports a backup, wipes the store, restores it, and
// asserts every collection came back at full count.
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
window.confirm = () => true;   // Reset All asks for confirmation.
window.alert = () => {};

const downloads = [];
window.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:captured/' + downloads.length; };
window.URL.revokeObjectURL = () => {};
const origCreate = doc.createElement.bind(doc);
doc.createElement = (tag) => {
  const el = origCreate(tag);
  if (String(tag).toLowerCase() === 'a') el.click = function(){ if (downloads.length) downloads.at(-1).__name = this.download; };
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
const store = () => JSON.parse(window.localStorage.getItem('job-tracker-pro-v2') || '{}').state || {};

const results = [];
const check = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); };

// Every collection the app owns. If a new one is added to AppState it must
// show up here too, or the round trip is only partially verified.
const COLLECTIONS = [
  'companies', 'jobs', 'interviews', 'contacts', 'tasks', 'notes', 'resumes',
  'bullets', 'offers', 'templates', 'outreach', 'savedSearches', 'goals',
  'questions', 'starStories', 'stages', 'activity',
];

(async () => {
  await tick(); await tick();

  // Force the persist middleware to write by making one mutation: toggle a
  // task on the Action Board. Without a mutation localStorage stays empty.
  click(byText('.nav-item', /Action Board/)); await tick();
  const box = $$('.task-row input[type="checkbox"]')[0];
  if (box) { box.click(); await tick(); }

  const before = store();
  const beforeCounts = {};
  for (const k of COLLECTIONS) beforeCounts[k] = (before[k] || []).length;
  const nonEmpty = COLLECTIONS.filter(k => beforeCounts[k] > 0);
  check('seeded state has data to back up', nonEmpty.length >= 12,
    `${nonEmpty.length}/${COLLECTIONS.length} collections populated`);
  check('STAR stories present before export', beforeCounts.starStories > 0,
    `${beforeCounts.starStories} stories`);

  // Counting rows after a restore proves nothing: "Reset all" re-seeds, so a
  // dropped collection is refilled with identical seed data and the counts
  // still match. (That is exactly why the misspelled key survived every other
  // suite.) Plant a sentinel row in each collection instead — seed data can
  // never contain it, so it comes back only if the restore really carried
  // that collection.
  const SENTINEL = '__roundtrip_sentinel__';
  if (window.__jtpStore) {
    window.__jtpStore.setState(s => {
      const patch = {};
      for (const k of COLLECTIONS) {
        const row = { id: SENTINEL + '_' + k, __sentinel: true, label: SENTINEL, name: SENTINEL, title: SENTINEL, color: '#000000', at: new Date().toISOString(), type: 'system', summary: SENTINEL };
        patch[k] = [...(s[k] || []), row];
      }
      return patch;
    });
    await tick();
  }
  const planted = store();
  const plantedOk = COLLECTIONS.filter(k => (planted[k] || []).some(r => r && r.__sentinel));
  check('sentinel planted in every collection', plantedOk.length === COLLECTIONS.length,
    `${plantedOk.length}/${COLLECTIONS.length}`);

  // --- Export ---
  click(byText('.nav-item', /Settings/)); await tick();
  const exportBtn = byText('button', /Export JSON/);
  check('Export JSON button exists', !!exportBtn);
  if (!exportBtn) return report();
  click(exportBtn); await tick();

  const blob = downloads.at(-1);
  const text = blob ? await blob.text() : '';
  let backup = null;
  try { backup = JSON.parse(text); } catch { /* handled by the check below */ }
  check('exported backup is valid JSON', !!backup, backup ? `${Math.round(text.length / 1024)} KB` : 'unparseable');
  if (!backup) return report();

  const missingFromFile = COLLECTIONS.filter(k => !(backup[k] || []).some(r => r && r.__sentinel));
  check('export contains every collection', missingFromFile.length === 0,
    missingFromFile.length ? `missing: ${missingFromFile.join(', ')}` : `${COLLECTIONS.length} collections written`);
  check('backup filename set', blob && /^job-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/.test(blob.__name || ''),
    blob ? blob.__name : 'none');

  // --- Wipe, then restore ---
  const resetBtn = byText('button', /Reset|Erase|Clear all/i);
  check('reset control exists', !!resetBtn, resetBtn ? resetBtn.textContent.trim() : 'MISSING');
  if (resetBtn) { click(resetBtn); await tick(); }
  const afterReset = store();

  // Restore straight through the store's own loadBackup, which is exactly what
  // the file-picker path calls once a file has been read.
  const ok = window.__jtpStore
    ? window.__jtpStore.getState().loadBackup(backup)
    : null;

  if (ok === null) {
    // No test hook exposed — fall back to asserting the allow-list statically
    // so this suite still fails when a key is misspelled.
    const src = fs.readFileSync(path.join(__dirname, 'src', 'store.ts'), 'utf8');
    const keys = [...(src.match(/const KEYS = \[([\s\S]*?)\] as const;/)[1].matchAll(/'([^']+)'/g))].map(m => m[1]);
    const missingKeys = COLLECTIONS.filter(k => !keys.includes(k));
    check('loadBackup allow-list covers every collection', missingKeys.length === 0,
      missingKeys.length ? `missing: ${missingKeys.join(', ')}` : `${keys.length} keys, all valid`);
    const bogus = keys.filter(k => !COLLECTIONS.includes(k));
    check('loadBackup allow-list has no dead keys', bogus.length === 0,
      bogus.length ? `not real fields: ${bogus.join(', ')}` : 'none');
  } else {
    check('loadBackup accepted the export', ok === true);
    await tick();
    const after = store();

    const wiped = COLLECTIONS.filter(k => !(afterReset[k] || []).some(r => r && r.__sentinel));
    check('reset actually cleared the sentinels', wiped.length === COLLECTIONS.length,
      `${wiped.length}/${COLLECTIONS.length} cleared`);

    const lost = COLLECTIONS.filter(k => !(after[k] || []).some(r => r && r.__sentinel));
    check('every collection survived the round trip', lost.length === 0,
      lost.length ? `dropped: ${lost.join(', ')}` : `all ${COLLECTIONS.length} restored`);

    const shrank = COLLECTIONS.filter(k => (after[k] || []).length < beforeCounts[k]);
    check('no collection lost rows', shrank.length === 0,
      shrank.length ? shrank.map(k => `${k} ${beforeCounts[k]}->${(after[k] || []).length}`).join(', ') : 'counts intact');
  }

  // A file that merely parses as JSON must be rejected, not restored over the
  // real pipeline.
  if (window.__jtpStore) {
    const rejected = window.__jtpStore.getState().loadBackup({ hello: 'world' });
    check('garbage JSON is rejected', rejected === false, `returned ${rejected}`);
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
