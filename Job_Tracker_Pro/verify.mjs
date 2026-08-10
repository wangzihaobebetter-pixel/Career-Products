/* Headless verification: boots the real built bundle in jsdom, walks every
   nav item, and asserts the interview<->pipeline linkage actually fires.
   Run with:  node verify.mjs   (after `npm run build`) */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find(f => f.endsWith('.js'));
const js = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
window.confirm = () => true;
// Capture whatever the export buttons hand to createObjectURL so the tests
// below can read the actual downloaded bytes rather than trusting the click.
const downloads = [];
window.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:x'; };
window.URL.revokeObjectURL = () => {};
window.onerror = (m) => errors.push(String(m));
window.addEventListener('error', e => errors.push(String(e.message)));

const pass = [], fail = [];
const check = (name, cond, extra = '') => (cond ? pass : fail).push(name + (extra ? ` — ${extra}` : ''));

try {
  window.eval(js);
} catch (e) {
  fail.push('bundle eval threw: ' + e.message);
}

const doc = window.document;
await new Promise(r => setTimeout(r, 400));

const root = doc.getElementById('root');
check('React mounted', !!root && root.children.length > 0);

const navBtns = [...doc.querySelectorAll('.nav-item')];
check('nav rendered (16 items)', navBtns.length === 16, `found ${navBtns.length}`);

// Walk every view.
for (const btn of navBtns) {
  const label = btn.textContent.replace(/\d+$/, '').trim();
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 120));
  const content = doc.querySelector('.content');
  check(`view renders: ${label}`, !!content && content.textContent.trim().length > 20,
        content ? `${content.textContent.trim().length} chars` : 'no .content');
}

// Offers view specifically.
const offersBtn = navBtns.find(b => b.textContent.includes('Offers'));
offersBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 150));
const offersText = doc.querySelector('.content')?.textContent || '';
check('Offers empty state present', offersText.includes('No offers yet'));
check('Offers has Record button', !!/Record Offer/.test(offersText));

// --- Tailor: paste a real JD and check the match engine end to end. ------
const setReactValue = (el, value) => {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};

const JD = `Data Analyst, Growth — Boston, MA (hybrid)

About the role
You will partner with product and marketing to measure activation and retention.

Requirements
- 0-2 years of experience in an analytics role
- Strong SQL; comfortable writing complex joins and window functions
- Python or R for analysis; pandas experience preferred
- Experience designing and reading A/B tests and experimentation results
- Build dashboards in Tableau or Looker for stakeholders
- Clear communication with non-technical partners

Nice to have
- Exposure to LLM tooling, prompt engineering, or machine learning workflows
- Kubernetes and Scala experience`;

const tailorBtn = navBtns.find(b => b.textContent.includes('Tailor'));
check('Tailor nav item exists', !!tailorBtn);
tailorBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 150));

const ta = doc.querySelector('.content textarea');
check('Tailor JD textarea rendered', !!ta);
if (ta) {
  setReactValue(ta, JD);
  await new Promise(r => setTimeout(r, 250));
  const txt = doc.querySelector('.content')?.textContent || '';

  check('Tailor: coverage panel rendered', /Keyword Coverage/.test(txt));
  const cov = txt.match(/library (\d+)% · selected (\d+)%/);
  check('Tailor: coverage numbers computed', !!cov, cov ? `library ${cov[1]}% / selected ${cov[2]}%` : 'no match');
  check('Tailor: library coverage > 0', cov && Number(cov[1]) > 0, cov ? `${cov[1]}%` : '');
  check('Tailor: selected coverage > 0', cov && Number(cov[2]) > 0, cov ? `${cov[2]}%` : '');

  // Known-present skills should be detected; a known-absent one should be a gap.
  check('Tailor: detected "sql" from JD', /✓ sql|✗ sql/.test(txt));
  check('Tailor: detected "a/b test" family', /ab test|a\/b test|experimentation/.test(txt.toLowerCase()));
  check('Tailor: kubernetes surfaces as a gap', /✗ kubernetes/.test(txt));

  const outMatch = txt.match(/Output \((\d+) bullets\)/);
  check('Tailor: auto-picked bullets', outMatch && Number(outMatch[1]) > 0,
        outMatch ? `${outMatch[1]} selected` : 'no output header');
  const pre = doc.querySelector('.content pre');
  check('Tailor: output block populated', !!pre && pre.textContent.includes('•'),
        pre ? `${pre.textContent.length} chars` : 'no pre');

  /* Save a tailored version and confirm it lands in the store.
     The seed ships 3 tailored versions already, so assert on the
     delta rather than an absolute count. */
  const tailoredCount = () => {
    const s = JSON.parse(window.localStorage.getItem('job-tracker-pro-v2') || '{}').state;
    return (s?.resumes || []).filter(r => r.type === 'tailored');
  };
  /* Read the "before" count off the rendered list, not localStorage: the
     persist middleware has not necessarily flushed yet at this point, and
     an unflushed store reads as zero. */
  const savedPanel = () => [...doc.querySelectorAll('.content .panel')]
    .find(p => /Saved tailored versions/.test(p.textContent));
  const before = savedPanel() ? savedPanel().querySelectorAll('.row').length : 0;
  const saveBtn = [...doc.querySelectorAll('.content button')].find(b => b.textContent.includes('Save version'));
  check('Tailor: Save version button present', !!saveBtn);
  saveBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  const after = tailoredCount();
  check('Tailor: exactly one version added', after.length === before + 1,
        `${before} → ${after.length}`);
  const saved = after[0];
  check('Tailor: saved version records matchScore', saved?.matchScore > 0, `score ${saved?.matchScore}`);
  check('Tailor: saved version records bullets', (saved?.bulletsUsed || []).length > 0,
        `${saved?.bulletsUsed?.length} bullets`);
  check('Tailor: saved version records matched keywords',
        (saved?.jdKeywordsMatched || []).length > 0, `${saved?.jdKeywordsMatched?.length} keywords`);
}

// --- Drive the real interview -> pipeline linkage through the UI. --------
const clickByText = (sel, text) => {
  const el = [...doc.querySelectorAll(sel)].find(e => e.textContent.includes(text));
  el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return !!el;
};
const ivBtn = navBtns.find(b => b.textContent.includes('Interviews'));
ivBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 120));
check('opened schedule-interview modal', clickByText('button', 'Schedule Interview'));
await new Promise(r => setTimeout(r, 150));

const modal = doc.querySelector('.modal');
check('interview form rendered', !!modal && /Schedule Interview/.test(modal.textContent));
let scheduledJobId = null;
if (modal) {
  const jobSelect = modal.querySelector('select');
  scheduledJobId = jobSelect?.value || null;
  // Type defaults to recruiter_call -> should advance the job to phone_screen.
  clickByText('.modal-actions button', 'Schedule');
  await new Promise(r => setTimeout(r, 200));
}
check('modal closed after scheduling', !doc.querySelector('.modal'));

// The bundle persists to localStorage under 'job-tracker-pro-v2'.
const raw = window.localStorage.getItem('job-tracker-pro-v2');
check('store persisted to localStorage', !!raw);
if (raw) {
  const st = JSON.parse(raw).state;
  check('seed: companies loaded', st.companies?.length >= 20, `${st.companies?.length} companies`);
  check('seed: jobs loaded', st.jobs?.length >= 40, `${st.jobs?.length} jobs`);
  check('seed: templates loaded', st.templates?.length >= 10, `${st.templates?.length} templates`);
  check('seed: questions loaded', st.questions?.length >= 30, `${st.questions?.length} questions`);

  /* The seed3 research bank: company-specific questions recovered from the
     2026-08-09 live research pass. These are the ones that make the prep
     view worth opening, so assert they survived the merge and the migrate. */
  const research = (st.questions || []).filter(x => String(x.id).startsWith('qr_'));
  check('research bank: merged into the question set', research.length >= 40,
        `${research.length} research questions`);
  const companiesCovered = new Set(research.map(x => x.company).filter(Boolean));
  check('research bank: covers 12 companies', companiesCovered.size >= 12,
        `${companiesCovered.size} companies: ${[...companiesCovered].slice(0, 4).join(', ')}…`);
  check('research bank: every question names its company',
        research.every(x => !!x.company),
        `${research.filter(x => !x.company).length} missing`);
  check('research bank: every question carries its sourcing note',
        research.every(x => /Live research 2026-08-09/.test(x.notes || '')),
        `${research.filter(x => !/Live research/.test(x.notes || '')).length} unsourced`);
  check('research bank: no truncated or non-question text',
        research.every(x => x.text.length > 20 && /[.?]$/.test(x.text)),
        `${research.filter(x => !(x.text.length > 20 && /[.?]$/.test(x.text))).length} malformed`);
  check('research bank: difficulty is graded 1-5',
        research.every(x => x.difficulty >= 1 && x.difficulty <= 5));
  check('offers array exists', Array.isArray(st.offers));
  check('interview recorded', st.interviews?.length === 1, `${st.interviews?.length} interviews`);
  const job = st.jobs?.find(j => j.id === scheduledJobId);
  check('linkage: job advanced to phone_screen', job?.status === 'phone_screen',
        `job "${job?.title}" is ${job?.status}`);
  check('linkage: stage change logged in history',
        !!job?.stageHistory?.some(h => h.to === 'phone_screen' && /Auto-advanced/.test(h.note || '')));
}

/* ---- Backup / export round-trip -------------------------------------
   These run last because the import test deliberately mutates the store. */
const settingsBtn = navBtns.find(b => b.textContent.includes('Settings'));
settingsBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 150));

downloads.length = 0;
clickByText('button', 'Export JSON');
await new Promise(r => setTimeout(r, 120));
check('export JSON produced a file', downloads.length === 1);

let backupText = null;
if (downloads[0]) {
  backupText = await downloads[0].text();
  let parsed = null;
  try { parsed = JSON.parse(backupText); } catch { /* reported below */ }
  check('exported JSON parses', !!parsed);
  check('export contains the pipeline', Array.isArray(parsed?.jobs) && parsed.jobs.length >= 40,
        `${parsed?.jobs?.length} jobs`);
  check('export contains companies', Array.isArray(parsed?.companies) && parsed.companies.length >= 20,
        `${parsed?.companies?.length} companies`);
  check('export carries the scheduled interview', parsed?.interviews?.length === 1);
}

downloads.length = 0;
clickByText('button', 'Export pipeline CSV');
await new Promise(r => setTimeout(r, 120));
if (downloads[0]) {
  const csv = await downloads[0].text();
  const lines = csv.replace(/^﻿/, '').split('\n');
  check('CSV header correct', lines[0].startsWith('Company,Title,Status,'));
  check('CSV has one row per job', lines.length >= 41, `${lines.length - 1} data rows`);
  // Every field with a comma must be quoted, or Excel silently shifts columns.
  const badQuoting = lines.slice(1).some(l => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
    return cells.length < 12;
  });
  check('CSV quoting keeps 12 columns on every row', !badQuoting);
} else {
  fail.push('export CSV produced no file');
}

/* Import: a JSON file that parses but is not a backup must be rejected
   without touching the store. Drive it through the real file input. */
const realCreate = doc.createElement.bind(doc);
let captured = null;
doc.createElement = (tag) => {
  const el = realCreate(tag);
  if (tag === 'input') { captured = el; el.click = () => {}; }
  return el;
};
const feedTo = async (buttonLabel, name, content) => {
  captured = null;
  clickByText('button', buttonLabel);
  await new Promise(r => setTimeout(r, 60));
  if (!captured) return false;
  const file = new window.File([content], name, { type: 'application/json' });
  Object.defineProperty(captured, 'files', { value: [file], configurable: true });
  await captured.onchange?.();
  await new Promise(r => setTimeout(r, 150));
  return true;
};
const feed = (name, content) => feedTo('Import JSON', name, content);

const jobsBefore = JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state.jobs.length;
const fed = await feed('junk.json', JSON.stringify({ hello: 'world' }));
check('import wired to a file input', fed);
const jobsAfterJunk = JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state.jobs.length;
check('import rejects a non-backup JSON without wiping data',
      jobsAfterJunk === jobsBefore, `${jobsBefore} → ${jobsAfterJunk} jobs`);
check('import shows the rejection message',
      /Not a Job Tracker backup/.test(doc.body.textContent));

if (backupText) {
  // Restoring a real export must round-trip the pipeline intact.
  const shrunk = JSON.parse(backupText);
  shrunk.jobs = shrunk.jobs.slice(0, 7);
  await feed('backup.json', JSON.stringify(shrunk));
  const st = JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state;
  check('import restores a real backup', st.jobs.length === 7, `${st.jobs.length} jobs`);
  check('restore keeps companies intact', st.companies.length >= 20, `${st.companies.length} companies`);
  check('restore is logged in activity',
        st.activity?.some(a => /Backup restored/.test(a.summary || '')));
}

/* ---- Seed attribution: every role must sit under its own employer ------
   Regression guard: roles for companies with no scored record used to fall
   back to companies[0], filing the real Clipboard Health application under
   Klaviyo. ------------------------------------------------------------- */
{
  // A second JSDOM gets its own localStorage, so this sees the pristine seed
  // rather than the shrunken pipeline the backup-restore test left behind.
  const fresh = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = fresh.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.eval(js);
  await new Promise(r => setTimeout(r, 400));
  // Force the persist middleware to flush by touching state.
  const settingsBtn = [...w.document.querySelectorAll('.nav-item')].find(b => b.textContent.includes('Settings'));
  settingsBtn?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 120));
  [...w.document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save Settings')
    ?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));

  const st = JSON.parse(w.localStorage.getItem('job-tracker-pro-v2')).state;
  const byId = Object.fromEntries(st.companies.map(c => [c.id, c.name]));
  const orphans = st.jobs.filter(j => !byId[j.companyId]);
  check('seed: every role has a real company record', orphans.length === 0, `${orphans.length} orphans`);

  const clip = st.jobs.find(j => /Strategy & Ops Associate, Applied AI/.test(j.title));
  check('seed: Clipboard application filed under Clipboard Health',
        !!clip && /clipboard/i.test(byId[clip.companyId] || ''), byId[clip?.companyId] || 'missing');
  const klaviyoId = st.companies.find(c => /klaviyo/i.test(c.name))?.id;
  const klaviyoJobs = st.jobs.filter(j => j.companyId === klaviyoId);
  check('seed: Klaviyo is no longer a dumping ground', klaviyoJobs.length <= 8,
        `${klaviyoJobs.length} roles at Klaviyo`);
  fresh.window.close();
}

/* ---- Research import: additive merge, must not clobber curated data ---- */
{
  const readState = () => JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state;
  const before = readState();
  const anchorJob = before.jobs[0];
  const anchorCo = before.companies.find(c => c.id === anchorJob.companyId) || before.companies[0];
  const appliedBefore = before.jobs.filter(j => j.status === 'applied').length;

  // Garbage must be refused outright.
  await feedTo('Import research JSON', 'junk.json', JSON.stringify({ nope: 1 }));
  check('research import rejects a non-research JSON',
        readState().jobs.length === before.jobs.length && /not a research export/i.test(doc.body.textContent),
        `${before.jobs.length} → ${readState().jobs.length} jobs`);

  const payload = {
    generatedAt: '2026-08-09', sourceChunk: 'verify_fixture.md',
    companies: [
      // Same company, messier spelling — must merge, not duplicate.
      { name: anchorCo.name.toUpperCase() + ', Inc.', industry: 'SHOULD_NOT_OVERWRITE', tier: 3 },
      { name: 'Zzz Fixture Labs', domain: 'zzzfixture.test', tier: 1,
        industry: 'AI infra', hqLocation: 'Boston, MA', whyRelevant: 'fixture' },
    ],
    jobs: [
      // Exact duplicate of a tracked role — must be skipped.
      { company: anchorCo.name, title: anchorJob.title, fitScore: 99 },
      { company: 'Zzz Fixture Labs', title: 'Fixture Analyst', location: 'Boston, MA',
        remoteType: 'hybrid', salaryMin: 85, salaryMax: 110000, fitScore: 88,
        requirements: ['SQL', 'Python'], fitReasoning: 'fixture reason' },
      { company: 'Zzz Fixture Labs', title: 'Fixture Strategy Associate', salaryMin: 2026, fitScore: 40 },
      { company: '', title: 'Nameless' },   // unusable -> skipped
    ],
    insights: [{ topic: 'Fixture insight', finding: 'a finding', actionable: 'do a thing' }],
  };
  await feedTo('Import research JSON', 'research.json', JSON.stringify(payload));

  // The review modal must appear and must not have written anything yet.
  const modal = doc.querySelector('.modal');
  check('research: review modal opens before committing', !!modal &&
        /Review research import/.test(modal.textContent || ''));
  check('research: nothing written until confirmed',
        readState().jobs.length === before.jobs.length,
        `${readState().jobs.length} jobs while reviewing`);
  const boxes = [...doc.querySelectorAll('.modal input[type=checkbox]')];
  check('research: one row per detected role', boxes.length === 3, `${boxes.length} rows`);
  check('research: duplicate row starts unchecked',
        boxes.filter(b => b.checked).length === 2, `${boxes.filter(b => b.checked).length} checked`);

  clickByText('.modal button', 'Import');
  await new Promise(r => setTimeout(r, 200));
  const after = readState();

  check('research: new roles added', after.jobs.length === before.jobs.length + 2,
        `${before.jobs.length} → ${after.jobs.length} jobs`);
  check('research: duplicate role skipped',
        after.jobs.filter(j => j.title === anchorJob.title).length === 1);
  check('research: new company added',
        after.companies.length === before.companies.length + 1,
        `${before.companies.length} → ${after.companies.length} companies`);
  check('research: name variant merged, not duplicated',
        after.companies.filter(c => /^zzz fixture/i.test(c.name)).length === 1);
  check('research: curated company field not overwritten',
        after.companies.find(c => c.id === anchorCo.id)?.industry !== 'SHOULD_NOT_OVERWRITE',
        String(after.companies.find(c => c.id === anchorCo.id)?.industry));
  check('research: applied jobs untouched',
        after.jobs.filter(j => j.status === 'applied').length === appliedBefore);
  const imported = after.jobs.find(j => j.title === 'Fixture Analyst');
  check('research: imported role lands in Wishlist', imported?.status === 'wishlist');
  check('research: thousands-shorthand salary normalized', imported?.salaryMin === 85000,
        String(imported?.salaryMin));
  check('research: implausible salary dropped',
        after.jobs.find(j => j.title === 'Fixture Strategy Associate')?.salaryMin === undefined);
  check('research: high fit score raises priority', imported?.priority === 'high');
  check('research: evidence kept in description', /verify_fixture\.md|fixture reason/.test(imported?.description || ''));
  check('research: insights stored as notes',
        after.notes?.some(n => n.title === 'Fixture insight'));
  check('research: import summary shown to user',
        /\+2 roles/.test(doc.body.textContent), doc.querySelector('.content')?.textContent.slice(0, 0) || '');
  check('research: import logged in activity',
        after.activity?.some(a => /Research imported/.test(a.summary || '')));
}
doc.createElement = realCreate;


/* ================================================================
   New in this round: bulk actions, undo, stage editor, ICS export,
   command palette, goal progress. Each test asserts observable state,
   not just that a button existed.
   ================================================================ */
const readState2 = () => JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nav = (label) => {
  const b = [...doc.querySelectorAll('.nav-item')].find(e => e.textContent.includes(label));
  b?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return !!b;
};

/* ---- Bulk actions in the Pipeline table ---- */
nav('Pipeline');
await sleep(120);
check('bulk: table mode reachable', clickByText('.toolbar button', 'table'));
await sleep(150);

const rowBoxes = () => [...doc.querySelectorAll('tbody input[type=checkbox]')];
// Earlier tests deliberately restored a shrunken backup, so compare against
// the live store rather than a hardcoded count.
const visibleJobs = readState2().jobs.filter(j => !j.archived).length;
check('bulk: a checkbox per visible row', rowBoxes().length === visibleJobs,
      `${rowBoxes().length} checkboxes / ${visibleJobs} jobs`);
check('bulk: no bulk bar before selecting', !doc.querySelector('[data-testid=bulk-bar]'));

const clickBox = (el) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
  setter.call(el, !el.checked);
  el.dispatchEvent(new window.Event('click', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
};

const before2 = readState2();
const boxes = rowBoxes();
clickBox(boxes[0]); await sleep(60);
clickBox(boxes[1]); await sleep(60);
clickBox(boxes[2]); await sleep(80);
const bar = doc.querySelector('[data-testid=bulk-bar]');
check('bulk: bar appears after selecting', !!bar);
check('bulk: bar reports the count', /3 selected/.test(bar?.textContent || ''), bar?.textContent?.slice(0, 40));

/* Move all three to "rejected" via the bulk select. */
const bulkSelect = bar?.querySelector('select');
if (bulkSelect) {
  const setSel = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setSel.call(bulkSelect, 'rejected');
  bulkSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(150);
}
const afterBulk = readState2();
const rejBefore = before2.jobs.filter(j => j.status === 'rejected').length;
const rejAfter = afterBulk.jobs.filter(j => j.status === 'rejected').length;
check('bulk: three jobs actually moved', rejAfter === rejBefore + 3, `${rejBefore} → ${rejAfter} rejected`);
check('bulk: move recorded as source "bulk" in history',
      afterBulk.jobs.some(j => j.stageHistory.some(h => h.source === 'bulk' && h.to === 'rejected')));
check('bulk: bar clears after acting', !doc.querySelector('[data-testid=bulk-bar]'));

/* ---- Undo restores the pre-bulk state in ONE step ---- */
const undoLink = [...doc.querySelectorAll('.toast .undo')].pop();
check('undo: toast offered an Undo affordance', !!undoLink);
undoLink?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(180);
const afterUndo = readState2();
check('undo: one click reverted all three moves',
      afterUndo.jobs.filter(j => j.status === 'rejected').length === rejBefore,
      `${afterUndo.jobs.filter(j => j.status === 'rejected').length} rejected`);
check('undo: revert is logged in activity',
      afterUndo.activity.some(a => a.type === 'undo'));

/* ---- Stage editor ---- */
nav('Settings');
await sleep(150);
const editor = doc.querySelector('[data-testid=stage-editor]');
check('stages: editor rendered', !!editor);
const labelInputs = editor ? [...editor.querySelectorAll('input:not([type=color])')] : [];
check('stages: one editable label per stage', labelInputs.length === readState2().stages.length,
      `${labelInputs.length} inputs / ${readState2().stages.length} stages`);

const saveBtn = doc.querySelector('[data-testid=save-stages]');
check('stages: save disabled until something changes', !!saveBtn?.disabled);

if (labelInputs[0]) {
  setReactValue(labelInputs[0], 'Shortlist');
  await sleep(120);
  const saveNow = doc.querySelector('[data-testid=save-stages]');
  check('stages: save enables after an edit', !saveNow?.disabled);
  saveNow?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(180);
  const st = readState2().stages;
  check('stages: rename persisted', st[0].label === 'Shortlist', st[0].label);
  check('stages: ids untouched by a rename', st[0].id === 'wishlist', st[0].id);
  const orphans = readState2().jobs.filter(j => !st.some(s2 => s2.id === j.status));
  check('stages: no job orphaned by the edit', orphans.length === 0, `${orphans.length} orphans`);
}

/* ---- ICS export: parse the bytes, don't trust the click ---- */
nav('Interviews');
await sleep(150);
downloads.length = 0;
check('ics: export button present', clickByText('button', 'Export .ics'));
await sleep(150);
check('ics: a calendar file was produced', downloads.length === 1);
if (downloads[0]) {
  const ics = await downloads[0].text();
  const ivCount = readState2().interviews.length;
  check('ics: valid VCALENDAR envelope',
        ics.startsWith('BEGIN:VCALENDAR') && ics.trimEnd().endsWith('END:VCALENDAR'));
  check('ics: one VEVENT per interview',
        (ics.match(/BEGIN:VEVENT/g) || []).length === ivCount, `${(ics.match(/BEGIN:VEVENT/g) || []).length} events / ${ivCount} interviews`);
  check('ics: CRLF line endings (RFC 5545)', ics.includes('\r\n') && !/[^\r]\n/.test(ics));
  check('ics: DTSTART is a UTC timestamp', /DTSTART:\d{8}T\d{6}Z/.test(ics));
  check('ics: every event has DTEND', (ics.match(/DTEND:/g) || []).length === ivCount);
  check('ics: reminders attached', ics.includes('TRIGGER:-PT24H') && ics.includes('TRIGGER:-PT60M'));
  check('ics: summary names the company', /SUMMARY:.+/.test(ics));
  check('ics: no line exceeds 75 octets',
        ics.split('\r\n').every(l => Buffer.byteLength(l, 'utf8') <= 75),
        `longest ${Math.max(...ics.split('\r\n').map(l => Buffer.byteLength(l, 'utf8')))}`);
}

/* ---- Command palette runs actions ---- */
const paletteBtn = doc.querySelector('[data-testid=open-palette]');
check('palette: launcher in the topbar', !!paletteBtn);
paletteBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(150);
const palette = doc.querySelector('[data-testid=command-palette]');
check('palette: opens', !!palette);
const items = palette ? [...palette.querySelectorAll('.qs-item')] : [];
check('palette: lists commands', items.length >= 15, `${items.length} commands`);

const themeBefore = readState2().settings.theme;
const pInput = palette?.querySelector('input');
if (pInput) {
  setReactValue(pInput, 'theme');
  await sleep(120);
  const filtered = [...doc.querySelectorAll('[data-testid=command-palette] .qs-item')];
  check('palette: filters as you type', filtered.length > 0 && filtered.length < items.length,
        `${filtered.length} of ${items.length}`);
  filtered[0]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(180);
}
check('palette: running a command changed real state',
      readState2().settings.theme !== themeBefore,
      `${themeBefore} → ${readState2().settings.theme}`);
check('palette: closes after running', !doc.querySelector('[data-testid=command-palette]'));

/* ---- Goal progress is derived, and derived correctly ---- */
nav('Stats');
await sleep(180);
const goalPanel = doc.querySelector('[data-testid=goal-panel]');
check('goals: panel rendered', !!goalPanel);
const goalRows = goalPanel ? [...goalPanel.querySelectorAll('.goal-row')] : [];
check('goals: one row per goal', goalRows.length === readState2().goals.length,
      `${goalRows.length} rows / ${readState2().goals.length} goals`);
if (goalRows.length) {
  const st2 = readState2();
  const appliedGoal = st2.goals.find(g => g.metric === 'applications_sent');
  const from = new Date(appliedGoal.startDate).getTime(), to = new Date(appliedGoal.endDate).getTime();
  const expected = st2.jobs.filter(j => j.stageHistory.some(h => {
    const t = new Date(h.at).getTime();
    return h.to === 'applied' && t >= from && t <= to;
  })).length;
  const rowText = goalRows.map(r => r.textContent).find(t => /Applications sent/.test(t)) || '';
  check('goals: applications-sent count matches the pipeline',
        rowText.includes(`${expected}/${appliedGoal.target}`),
        `expected ${expected}/${appliedGoal.target}, row said "${(rowText.match(/\d+\/\d+/) || [])[0]}"`);
  check('goals: progress bar has a width', goalRows.some(r => /width/.test(r.querySelector('.goal-bar span')?.getAttribute('style') || '')));
  check('goals: every row explains what it counted', goalRows.every(r => (r.querySelector('.goal-why')?.textContent || '').length > 20));
}


// --- Company Intel: the research has to reach the screen, graded. -------
{
  const intelBtn = navBtns.find(b => b.textContent.includes('Company Intel'));
  intelBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  const content = doc.querySelector('.content');
  const text = content?.textContent || '';

  const cards = [...doc.querySelectorAll('.panel')].filter(p => /Show loop, traps/.test(p.textContent));
  check('intel: one card per company', cards.length >= 18, `${cards.length} cards`);
  check('intel: first-hand loops are surfaced', /First-hand write-up/.test(text));
  check('intel: reconstructions are labelled as such', /Reconstructed — not documented/.test(text));
  check('intel: Notion 5-round loop present', /Notion/.test(text) && /5 rounds/.test(text));
  check('intel: comp anchors carry an as-of date', /levels\.fyi 2026-08-09/.test(text));

  // Expanding a card must reveal the real loop text and its sources.
  const notionCard = cards.find(c => /^Notion/.test(c.textContent.trim()));
  const toggle = [...(notionCard?.querySelectorAll('button') || [])]
    .find(b => /Show loop/.test(b.textContent));
  const before = notionCard?.textContent.length || 0;
  toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  const after = notionCard?.textContent.length || 0;
  check('intel: expanding a card reveals the loop', after > before + 400, `${before} → ${after} chars`);
  check('intel: the verbatim take-home brief is there',
        /simplified block based editor/.test(notionCard?.textContent || ''));
  check('intel: sources are real links',
        [...(notionCard?.querySelectorAll('a[href^="http"]') || [])].length >= 3,
        `${[...(notionCard?.querySelectorAll('a[href^="http"]') || [])].length} links`);

  // Evidence filter must actually filter.
  const sel = [...doc.querySelectorAll('select')].find(s => /All evidence/.test(s.textContent));
  if (sel) {
    const setSel = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    };
    setSel(sel, 'firsthand');
    await new Promise(r => setTimeout(r, 150));
    const firsthandCards = [...doc.querySelectorAll('.panel')].filter(p => /Show loop, traps/.test(p.textContent));
    check('intel: evidence filter narrows the list',
          firsthandCards.length > 0 && firsthandCards.length < cards.length,
          `${cards.length} → ${firsthandCards.length}`);
    check('intel: filtered list is only first-hand',
          firsthandCards.every(c => /First-hand write-up/.test(c.textContent)));
    setSel(sel, 'all');
    await new Promise(r => setTimeout(r, 120));
  } else {
    fail.push('intel: evidence filter missing');
  }

  // Visa tab.
  const visaBtn = [...doc.querySelectorAll('button')].find(b => b.textContent.trim() === 'Work Authorisation');
  visaBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  const visaText = doc.querySelector('.content')?.textContent || '';
  check('intel: visa timeline renders', visaText.length > 2000, `${visaText.length} chars`);
  check('intel: visa milestones carry gov sources', /uscis\.gov|federalregister\.gov/.test(visaText));
  check('intel: the STEM OPT backstop is stated', /24-month STEM/.test(visaText));
  check('intel: it says plainly it is not legal advice', /not legal advice/i.test(visaText));
}

/* ---- 90-Day Playbook ---- */
{
  nav('90-Day Playbook');
  await sleep(150);
  const pbText = () => doc.querySelector('.content').textContent;
  const t0 = pbText();
  check('playbook: all three phases render', /Phase 1/.test(t0) && /Phase 2/.test(t0) && /Phase 3/.test(t0));
  check('playbook: day counter is live', /Day \d+/.test(t0), (t0.match(/Day \d+ of 90/) || ['no day counter'])[0]);

  const boxes = [...doc.querySelectorAll('.content input[type=checkbox]')];
  check('playbook: action items are checkable', boxes.length >= 20, `${boxes.length} checkboxes`);

  // Ticking must survive into persisted state, not just flip the DOM.
  const before = Object.keys(readState2().planChecks || {}).length;
  boxes[0].click();
  await sleep(150);
  const after = Object.keys(readState2().planChecks || {}).length;
  check('playbook: a tick persists to the store', after === before + 1, `${before} → ${after}`);
  check('playbook: progress counter moved', /1\/\d+ ticked/.test(pbText()),
        (pbText().match(/\d+\/\d+ ticked/) || ['not found'])[0]);

  check('playbook: weekly targets tab', clickByText('.toolbar button', 'Weekly Targets'));
  await sleep(120);
  check('playbook: target table has the per-phase columns', /Applications \(verified\)/.test(pbText()) && /7–8 \/wk/.test(pbText()));

  check('playbook: failure modes tab', clickByText('.toolbar button', 'Failure Modes'));
  await sleep(120);
  const fmText = pbText();
  check('playbook: all 8 failure modes render', (fmText.match(/FM[1-8]/g) || []).length === 8);
  check('playbook: LinkedIn red line is stated', /restricted a third time/i.test(fmText));

  check('playbook: self-check tab', clickByText('.toolbar button', 'Weekly Self-Check'));
  await sleep(120);
  check('playbook: self-check sections render', /Numbers/.test(pbText()) && /Next week/.test(pbText()));

  // Reset must clear what was ticked.
  clickByText('.toolbar button', 'Reset');
  await sleep(150);
  check('playbook: reset clears progress', Object.keys(readState2().planChecks || {}).length === 0);
}

// --- Question bank: the mined research has to reach the screen, graded. ---
{
  const qBtn = navBtns.find(b => b.textContent.includes('Interview Prep'));
  qBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(180);

  const st = readState2();
  const qs = st.questions || [];
  check('qbank: store carries the mined bank', qs.length >= 300, `${qs.length} questions`);
  const mined = qs.filter(q => /^qm_/.test(q.id));
  check('qbank: mined ids present', mined.length >= 280, `${mined.length} mined`);

  const sourced = mined.filter(q => /^Sourced:/.test(q.notes || ''));
  const typeLevel = mined.filter(q => /Type-level/.test(q.notes || ''));
  check('qbank: sourced questions carry a traceable note', sourced.length >= 150, `${sourced.length} sourced`);
  check('qbank: unverified ones are labelled type-level', typeLevel.length >= 100, `${typeLevel.length} type-level`);
  check('qbank: every mined question is graded', sourced.length + typeLevel.length === mined.length);
  // A "sourced" note must actually name where it came from, or the grade lies.
  check('qbank: sourced notes name a source',
        sourced.every(q => /Burn[A-Z]\w*|r\/[A-Za-z]/.test(q.notes)),
        `${sourced.filter(q => !/Burn[A-Z]\w*|r\/[A-Za-z]/.test(q.notes)).length} unnamed`);

  const companiesCovered = new Set(mined.filter(q => q.company).map(q => q.company));
  check('qbank: multi-company coverage', companiesCovered.size >= 15, `${companiesCovered.size} companies`);
  for (const co of ['Klaviyo', 'Notion', 'Glean', 'Datadog']) {
    check(`qbank: ${co} has questions`, mined.some(q => q.company === co));
  }

  const qText = () => doc.querySelector('.content')?.textContent || '';
  const cardCount = () => doc.querySelectorAll('.content .panel').length;
  check('qbank: cards render', cardCount() > 20, `${cardCount()} cards`);
  check('qbank: provenance badge is on screen', /sourced|type-level|curated/.test(qText()));
  check('qbank: coach notes are collapsible', doc.querySelectorAll('.content details').length > 10,
        `${doc.querySelectorAll('.content details').length} details`);

  // Filters must actually narrow the list, not just re-render it.
  const selects = [...doc.querySelectorAll('.toolbar select')];
  check('qbank: three filters present', selects.length === 3, `${selects.length} selects`);
  const before = cardCount();
  const coSel = selects[0];
  const klav = [...coSel.options].find(o => /^Klaviyo/.test(o.value));
  check('qbank: company filter lists Klaviyo', !!klav);
  if (klav) {
    coSel.value = klav.value;
    coSel.dispatchEvent(new window.Event('change', { bubbles: true }));
    await sleep(150);
    const after = cardCount();
    check('qbank: company filter narrows the list', after > 0 && after < before, `${before} → ${after}`);
    check('qbank: filtered cards are all Klaviyo',
          [...doc.querySelectorAll('.content .panel')].every(p => p.textContent.includes('Klaviyo')));
    coSel.value = '';
    coSel.dispatchEvent(new window.Event('change', { bubbles: true }));
    await sleep(150);
  }
  const gradeSel = selects[2];
  gradeSel.value = 'sourced';
  gradeSel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(150);
  const sourcedCards = [...doc.querySelectorAll('.content .panel')];
  check('qbank: provenance filter works', sourcedCards.length > 0 && sourcedCards.length < before,
        `${before} → ${sourcedCards.length}`);
  check('qbank: provenance filter returns only sourced',
        sourcedCards.every(p => /✓ sourced/.test(p.textContent)));
  gradeSel.value = '';
  gradeSel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(120);
}

check('zero runtime JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log('\nPASS:');
pass.forEach(p => console.log('  ✓ ' + p));
if (fail.length) {
  console.log('\nFAIL:');
  fail.forEach(f => console.log('  ✗ ' + f));
}
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
