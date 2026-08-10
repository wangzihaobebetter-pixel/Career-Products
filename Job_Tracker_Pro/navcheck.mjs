import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('dist/index.html','utf8');
const jsFile = fs.readdirSync('dist/assets').find(f=>f.endsWith('.js'));
const js = fs.readFileSync(`dist/assets/${jsFile}`,'utf8');
const dom = new JSDOM(html, { runScripts:'outside-only', url:'http://localhost:4173/', pretendToBeVisual:true });
const w = dom.window;
w.matchMedia = w.matchMedia || (q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}));
const errs=[];
w.addEventListener('error', e=>errs.push(String(e.error||e.message)));
const origErr = console.error;
console.error = (...a)=>{ const s=a.join(' '); if(!/not wrapped in act|validateDOMNesting/.test(s)) errs.push(s); };
w.eval(js);
await new Promise(r=>setTimeout(r,600));
const d = w.document;
const links = [...d.querySelectorAll('nav a, nav button, .nav a, .nav button, aside a, aside button')];
const labels = ['Dashboard','Pipeline','Companies','Contacts','Interviews','Offers','Resume & Bullets','Tailor to JD','Email Templates','Interview Prep','Outreach Sequences','Company Intel','Action Board','90-Day Playbook','Stats','Settings'];
let pass=0, fail=0;
for (const label of labels) {
  const el = links.find(a => (a.textContent||'').includes(label));
  if (!el) { console.log(`  ✗ nav item missing: ${label}`); fail++; continue; }
  el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  const main = d.querySelector('main') || d.body;
  const txt = (main.textContent||'').replace(/\s+/g,' ').trim();
  if (txt.length > 60) { console.log(`  ✓ ${label} — ${txt.length} chars`); pass++; }
  else { console.log(`  ✗ ${label} rendered thin — ${txt.length} chars :: ${txt.slice(0,80)}`); fail++; }
}
console.log(`\nnav: ${pass} passed, ${fail} failed, js errors: ${errs.length}`);
if (errs.length) console.log(errs.slice(0,5).join('\n'));
process.exit(fail || errs.length ? 1 : 0);
