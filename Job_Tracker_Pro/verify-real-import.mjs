/* Feed the actual research file produced by a corpus run through the real
   built bundle's importer, and print what it would put in the pipeline. */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist,'assets')).find(f=>f.endsWith('.js'));
const js = fs.readFileSync(path.join(dist,'assets',jsFile),'utf8');
const errors=[];
const dom = new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
window.scrollTo=()=>{}; window.confirm=()=>true;
window.URL.createObjectURL=()=>'blob:x'; window.URL.revokeObjectURL=()=>{};
window.onerror=m=>errors.push(String(m));
window.eval(js);
const doc=window.document;
await new Promise(r=>setTimeout(r,400));

const navBtns=[...doc.querySelectorAll('.nav-item')];
navBtns.find(b=>b.textContent.includes('Settings')).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,150));

const realCreate=doc.createElement.bind(doc);
let captured=null;
doc.createElement=(tag)=>{const el=realCreate(tag); if(tag==='input'){captured=el; el.click=()=>{};} return el;};

const read=()=>JSON.parse(window.localStorage.getItem('job-tracker-pro-v2')).state;
// persist middleware only writes on the first state change, so force one
[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()==='Save Settings')
  ?.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,150));
const before=read();

const DEFAULT_FIXTURE = path.join(
  process.env.HOME, 'Desktop', 'Open claw', 'M3 Research Burn',
  'BurnC01_Chunk01_StructuredJSON_2026-08-09.json',
);
const file = process.argv[2] || DEFAULT_FIXTURE;
if (!fs.existsSync(file)) {
  console.error('no research JSON to import from:', file);
  console.error('pass one explicitly: node verify-real-import.mjs <path-to.json>');
  process.exit(1);
}
const content = fs.readFileSync(file,'utf8');
captured=null;
[...doc.querySelectorAll('button')].find(b=>b.textContent.includes('Import research JSON'))
  .dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,60));
const f=new window.File([content], path.basename(file), {type:'application/json'});
Object.defineProperty(captured,'files',{value:[f],configurable:true});
await captured.onchange?.();
await new Promise(r=>setTimeout(r,400));

const modal=doc.querySelector('.modal');
console.log('review modal opened:', !!modal);
const boxes=[...doc.querySelectorAll('.modal input[type=checkbox]')];
console.log('rows offered:', boxes.length, '| pre-checked:', boxes.filter(b=>b.checked).length);
console.log('jobs while reviewing (must be unchanged):', read().jobs.length);
const btn=[...doc.querySelectorAll('.modal button')].find(b=>/^Import/.test(b.textContent.trim()));
console.log('confirm button:', btn?.textContent.trim());
btn?.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,400));

const after=read();
console.log('file:', path.basename(file), (content.length/1024).toFixed(0)+' KB');
console.log('jobs      :', before.jobs.length, '->', after.jobs.length);
console.log('companies :', before.companies.length, '->', after.companies.length);
console.log('notes     :', (before.notes||[]).length, '->', (after.notes||[]).length);
const msg=[...doc.querySelectorAll('.panel')].map(p=>p.textContent).find(t=>/^Import Research/.test(t.trim()));
console.log('ui says   :', (msg||'').replace(/^Import Research.*?Wishlist\./s,'').trim().slice(0,300));
const added=after.jobs.filter(j=>!before.jobs.some(b=>b.id===j.id));
console.log('\nsample imported roles:');
added.slice(0,12).forEach(j=>{
  const co=after.companies.find(c=>c.id===j.companyId);
  console.log('  -', (co?.name||'?')+' — '+j.title, j.salaryMin?`($${j.salaryMin}-${j.salaryMax??'?'})`:'', j.status);
});
const bad=added.filter(j=>!j.title || !j.companyId || j.status!=='wishlist');
console.log('\nmalformed imported rows:', bad.length);
console.log('runtime errors:', errors.length);
