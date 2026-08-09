import { JSDOM } from 'jsdom';
import fs from 'fs';
const jsFile=fs.readdirSync('dist/assets').find(f=>f.endsWith('.js'));
const js=fs.readFileSync('dist/assets/'+jsFile,'utf8');
const errors=[];
const dom=new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost:5173/'});
const w=dom.window, doc=w.document;
w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
w.scrollTo=()=>{};
if(!w.crypto) w.crypto={};
if(!w.crypto.randomUUID) w.crypto.randomUUID=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c=='x'?r:(r&0x3|0x8)).toString(16);});
w.onerror=(m)=>errors.push('onerror: '+m);
const realErr=console.error;
w.console={...console, error:(...a)=>{const s=a.map(String).join(' '); if(!/not wrapped in act|Warning: /.test(s)) errors.push('console.error: '+s.slice(0,200));}};
try{ w.eval(js);}catch(e){errors.push('EVAL: '+e.message);}
await new Promise(r=>setTimeout(r,700));
const navBtns=[...doc.querySelectorAll('.nav-item')];
console.log('nav buttons:', navBtns.length, '->', navBtns.map(b=>b.textContent.trim()).join(' | '));
const rows=[];
for(const btn of navBtns){
  const name=btn.textContent.trim();
  const before=errors.length;
  btn.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  const main=doc.querySelector('main')||doc.getElementById('root');
  const txt=(main.textContent||'').trim();
  rows.push({name, len:txt.length, els:main.querySelectorAll('*').length, err:errors.length-before});
}
console.log('\n--- VIEW RENDER (clicked each nav item) ---');
for(const r of rows) console.log(`${r.name.padEnd(22)} textLen=${String(r.len).padStart(6)}  domNodes=${String(r.els).padStart(5)}  newErrors=${r.err}`);
const raw=w.localStorage.getItem('job-tracker-pro-v2');
if(raw){const s=JSON.parse(raw).state||{};
  console.log('\n--- PERSISTED DATA COUNTS ---');
  for(const k of Object.keys(s)) if(Array.isArray(s[k])) console.log(`  ${k.padEnd(15)} ${s[k].length}`);
}
console.log('\nTOTAL JS ERRORS:', errors.length);
errors.slice(0,8).forEach(e=>realErr('  '+e));
