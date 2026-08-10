// Verification for the interview prep checklist + self scorecard + debrief.
//
// The Interviews empty state promises that "the prep checklist and scorecard
// become available on that entry". This script drives the real built bundle in
// jsdom to prove that promise is kept: it schedules an interview, opens the
// entry, generates a checklist, ticks an item, scores the round, records a
// question that was asked, banks it, and confirms every one of those survived
// into localStorage.
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
window.confirm = () => true;

const assets = fs.readdirSync(path.join(DIST, 'assets'));
const js = assets.find(f => f.endsWith('.js'));
const s = doc.createElement('script');
s.textContent = fs.readFileSync(path.join(DIST, 'assets', js), 'utf8');
doc.body.appendChild(s);

const tick = () => new Promise(r => setTimeout(r, 60));
const $$ = sel => Array.from(doc.querySelectorAll(sel));
const $ = sel => doc.querySelector(sel);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const byText = (sel, re) => $$(sel).find(e => re.test((e.textContent || '').trim()));
const store = () => JSON.parse(window.localStorage.getItem('job-tracker-pro-v2') || '{}').state || {};

// React tracks input value on the DOM node, so a plain .value assignment is
// swallowed. Go through the native setter the way React itself does.
function setValue(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
    : el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

const results = [];
const check = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); };

(async () => {
  await tick(); await tick();

  const nav = byText('.nav-item', /Interviews/);
  check('Interviews nav item exists', !!nav);
  if (!nav) return report();
  click(nav); await tick();

  // --- schedule a round -------------------------------------------------
  const scheduleBtn = byText('button', /Schedule Interview/);
  check('schedule control exists', !!scheduleBtn);
  if (!scheduleBtn) return report();
  click(scheduleBtn); await tick();

  const modal = $('.modal');
  check('schedule form opens in a modal', !!modal && /Schedule Interview/.test(modal.textContent || ''));

  const typeSel = $$('.modal select')[1];
  if (typeSel) setValue(typeSel, 'onsite');
  const dateInput = $('.modal input[type="date"]');
  // Yesterday: the debrief tab is only honest about a round that has happened.
  const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateInput) setValue(dateInput, past);
  await tick();

  const submit = byText('.modal button', /^Schedule$/);
  check('form has a submit control', !!submit);
  if (submit) { click(submit); await tick(); }

  const ivs = store().interviews || [];
  check('interview persisted to the store', ivs.length === 1, `${ivs.length} interview(s)`);
  const iv = ivs[0];
  check('scheduled round kept its type', iv && iv.type === 'onsite', iv ? iv.type : 'none');

  // Booking a round should carry the application forward with it.
  const linkedJob = (store().jobs || []).find(j => j.id === (iv || {}).jobId);
  check('booking a round advanced the application stage',
    !!linkedJob && ['onsite', 'final', 'offer', 'accepted'].includes(linkedJob.status),
    linkedJob ? linkedJob.status : 'no job');

  // --- open the entry ---------------------------------------------------
  const listBtn = byText('.toolbar button', /^list$/);
  if (listBtn) { click(listBtn); await tick(); }
  const openBtn = $(`[data-testid="open-iv-${iv.id}"]`);
  check('list row exposes a way into the entry', !!openBtn, openBtn ? openBtn.textContent.trim() : 'MISSING');
  if (!openBtn) return report();
  click(openBtn); await tick();

  check('interview detail panel opens', !!$('[data-testid="interview-detail"]'));

  // --- prep checklist ---------------------------------------------------
  const gen = $('[data-testid="generate-prep"]');
  check('generate-checklist control exists', !!gen);
  if (!gen) return report();
  click(gen); await tick();

  const saved = () => (store().interviews || []).find(x => x.id === iv.id) || {};
  const list1 = saved().prepChecklist || [];
  check('generating produced a checklist', list1.length >= 6, `${list1.length} items`);
  check('checklist is specific to an onsite, not generic',
    list1.some(i => /agenda|interviewer|panel/i.test(i.text)),
    list1.slice(0, 2).map(i => i.text.slice(0, 40)).join(' | '));
  check('every checklist item starts unticked', list1.every(i => i.done === false));

  const rows = $$('[data-testid="prep-list"] .row');
  check('checklist renders one row per item', rows.length === list1.length, `${rows.length} rows`);

  // Tick the first item.
  const box = $('[data-testid="prep-list"] input[type="checkbox"]');
  if (box) { box.click(); await tick(); }
  const list2 = saved().prepChecklist || [];
  check('ticking an item persists', list2.filter(i => i.done).length === 1,
    `${list2.filter(i => i.done).length} done`);

  // Re-generating must not wipe the tick or duplicate lines.
  click(gen); await tick();
  const list3 = saved().prepChecklist || [];
  check('re-generating does not duplicate items', list3.length === list2.length,
    `${list2.length} -> ${list3.length}`);
  check('re-generating preserves ticked work', list3.filter(i => i.done).length === 1);

  // Add a custom item.
  const addInput = $$('.modal input').find(i => /Add your own prep item/.test(i.placeholder || ''));
  check('custom prep item input exists', !!addInput);
  if (addInput) {
    setValue(addInput, 'Ask about the on-call rotation');
    const addBtn = byText('.modal button', /^Add$/);
    if (addBtn) { click(addBtn); await tick(); }
  }
  const list4 = saved().prepChecklist || [];
  check('custom prep item is added', list4.some(i => /on-call rotation/.test(i.text)),
    `${list4.length} items`);

  // Prep notes write through.
  const notes = $$('.modal textarea')[0];
  if (notes) { setValue(notes, 'Lead with the schema-bound agent story.'); await tick(); }
  check('prep notes persist', /schema-bound/.test(saved().prepNotes || ''), saved().prepNotes || 'empty');

  // --- debrief ----------------------------------------------------------
  const debriefTab = byText('.modal button', /^debrief$/);
  check('debrief tab exists', !!debriefTab);
  if (!debriefTab) return report();
  click(debriefTab); await tick();

  check('scorecard starts unscored', /not scored/.test(($('[data-testid="scorecard-avg"]') || {}).textContent || ''));

  for (const [key, n] of [['technical', 4], ['communication', 5], ['problemSolving', 3], ['culture', 4]]) {
    const b = $(`[data-testid="score-${key}-${n}"]`);
    if (b) { click(b); await tick(); }
  }
  const sc = saved().selfScorecard || {};
  check('every scored dimension persisted',
    sc.technical === 4 && sc.communication === 5 && sc.problemSolving === 3 && sc.culture === 4,
    JSON.stringify(sc));
  check('scorecard average is computed from the graded dimensions',
    /avg 4\/5/.test(($('[data-testid="scorecard-avg"]') || {}).textContent || ''),
    ($('[data-testid="scorecard-avg"]') || {}).textContent || 'none');

  // Record a question that was actually asked, then bank it.
  const qIn = $('[data-testid="asked-input"]');
  check('asked-question input exists', !!qIn);
  if (qIn) {
    setValue(qIn, 'Walk me through how you would measure whether an agent is actually helping users.');
    const qAdd = $('[data-testid="asked-add"]');
    if (qAdd) { click(qAdd); await tick(); }
  }
  const asked = saved().questionsAsked || [];
  check('asked question persisted', asked.length === 1, `${asked.length} recorded`);

  const bankBefore = (store().questions || []).length;
  const bankBtn = byText('.modal button', /＋ bank/);
  check('bank control exists', !!bankBtn);
  if (bankBtn) { click(bankBtn); await tick(); }
  const qs = store().questions || [];
  check('banking adds it to the question bank', qs.length === bankBefore + 1,
    `${bankBefore} -> ${qs.length}`);
  const banked = qs.find(q => /measure whether an agent/.test(q.text));
  check('banked question is tagged with the company', !!(banked && banked.company),
    banked ? String(banked.company) : 'not found');
  check('banked question records that it was really asked',
    !!(banked && /Asked in a real/.test(banked.notes || '')),
    banked ? String(banked.notes).slice(0, 50) : 'none');

  // Outcome from the detail panel must still drive the pipeline.
  const outcome = $('[data-testid="detail-outcome"]');
  check('outcome control exists in the detail panel', !!outcome);
  if (outcome) { setValue(outcome, 'failed'); await tick(); }
  const jobAfter = (store().jobs || []).find(j => j.id === iv.jobId);
  check('a failed round closes the application', jobAfter && jobAfter.status === 'rejected',
    jobAfter ? jobAfter.status : 'no job');
  check('failed outcome recorded on the interview', saved().outcome === 'failed', saved().outcome);

  check('no uncaught JS errors', errors.length === 0, errors.join(' | ') || 'clean');
  report();
})().catch(e => { console.error(e); process.exit(1); });

function report() {
  let pass = 0;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
    if (r.ok) pass++;
  }
  console.log(`\n=== ${pass}/${results.length} checks passed ===`);
  process.exit(pass === results.length ? 0 : 1);
}
