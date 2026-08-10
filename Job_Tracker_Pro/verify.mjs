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
window.URL.createObjectURL = () => 'blob:x';
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
check('nav rendered (13 items)', navBtns.length === 13, `found ${navBtns.length}`);

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
  check('offers array exists', Array.isArray(st.offers));
  check('interview recorded', st.interviews?.length === 1, `${st.interviews?.length} interviews`);
  const job = st.jobs?.find(j => j.id === scheduledJobId);
  check('linkage: job advanced to phone_screen', job?.status === 'phone_screen',
        `job "${job?.title}" is ${job?.status}`);
  check('linkage: stage change logged in history',
        !!job?.stageHistory?.some(h => h.to === 'phone_screen' && /Auto-advanced/.test(h.note || '')));
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
