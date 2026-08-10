const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const DIST='dist';
const html=fs.readFileSync(path.join(DIST,'index.html'),'utf8');
const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const m=e.message||String(e);if(!/Could not load link/.test(m))errors.push(m);});
vc.on('error',(...a)=>errors.push('console.error: '+a.join(' ')));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:vc});
const {window}=dom,doc=window.document;
window.matchMedia=window.matchMedia||(q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}));
if(!window.crypto)window.crypto={};
if(!window.crypto.randomUUID)window.crypto.randomUUID=()=>'id-'+Math.random().toString(36).slice(2);
const assets=fs.readdirSync(path.join(DIST,'assets'));
const s=doc.createElement('script');
s.textContent=fs.readFileSync(path.join(DIST,'assets',assets.find(f=>f.endsWith('.js'))),'utf8');
doc.body.appendChild(s);
const tick=(n=90)=>new Promise(r=>setTimeout(r,n));
const $$=sel=>Array.from(doc.querySelectorAll(sel));
const click=el=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
function setInput(el,value){
  const proto=el.tagName==='SELECT'?window.HTMLSelectElement.prototype:(el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
  el.dispatchEvent(new window.Event('input',{bubbles:true}));
  el.dispatchEvent(new window.Event('change',{bubbles:true}));
}
let pass=0,fail=0;
const ok=(c,m,d)=>{c?(pass++,console.log('  PASS  '+m+(d?'  — '+d:''))):(fail++,console.log('  FAIL  '+m+(d?'  — '+d:'')));};
const store=()=>{const r=window.localStorage.getItem('job-tracker-pro-v2');return r?JSON.parse(r).state:null;};

(async()=>{
  await tick(700);
  const panels=()=>$$('.panel');
  const panelBy=re=>panels().find(p=>re.test(p.querySelector('h3')?.textContent||''));

  // 1. new panels exist
  ok(!!panelBy(/Needs Follow-Up/),'Needs Follow-Up panel rendered');
  ok(!!panelBy(/Work Authorization/),'Work Authorization panel rendered');
  ok(!!panelBy(/Tasks Due/),'Tasks Due panel rendered');
  const wa=panelBy(/Work Authorization/);
  ok(wa && wa.querySelectorAll('.row').length>0,'visa milestones listed', wa?wa.querySelectorAll('.row').length+' rows':'');
  const wt=panelBy(/This Week's Targets/);
  ok(!!wt,'Weekly targets panel rendered', wt?wt.querySelectorAll('.row').length+' goals':'');

  // 2. follow-up suggestions -> create task
  const nf=panelBy(/Needs Follow-Up/);
  const sugRows=nf?nf.querySelectorAll('.row').length:0;
  // Seed data is created today, so nothing has passed its cadence yet. Either
  // real suggestions or the honest empty state is correct; a blank panel is not.
  const hasEmpty=nf&&/Nothing overdue/.test(nf.textContent||'');
  ok(sugRows>0||hasEmpty,'follow-up panel shows suggestions or an honest empty state', sugRows+' suggestions'+(hasEmpty?' (empty state)':''));
  if(sugRows>0){
    const before=store();
    const beforeTasks=before?before.tasks.length:0;
    const addBtn=nf&&Array.from(nf.querySelectorAll('button')).find(b=>/Task/.test(b.textContent||''));
    if(addBtn){
      click(addBtn); await tick(300);
      const after=store();
      ok(after && after.tasks.length===beforeTasks+1,'"+ Task" on a suggestion writes a real task');
    } else ok(false,'"+ Task" button present');
  }

  // 3. "+ Add" opens a REAL form (not a placeholder toast)
  const td=panelBy(/Tasks Due/);
  const plusAdd=td&&Array.from(td.querySelectorAll('button')).find(b=>/Add/.test(b.textContent||''));
  click(plusAdd); await tick(300);
  const overlay=doc.querySelector('.modal-overlay');
  ok(!!overlay,'"+ Add" opens a modal');
  const toastTxt=($$('.toast')[0]||{}).textContent||'';
  ok(!/coming in full build/.test(toastTxt),'no placeholder toast', toastTxt||'(none)');
  const titleIn=overlay&&overlay.querySelector('input[type=text], input:not([type])');
  const dueIn=overlay&&overlay.querySelector('input[type=date]');
  const today=new Date().toISOString().slice(0,10);
  const st0=store();
  const n0=st0?st0.tasks.length:0;
  if(titleIn){
    setInput(titleIn,'Probe task due today');
    if(dueIn) setInput(dueIn,today);
    const submit=Array.from(overlay.querySelectorAll('button')).find(b=>/Add task/.test(b.textContent||''));
    click(submit); await tick(350);
    const st=store();
    ok(st && st.tasks.length>=n0+1,'quick-add form persists a task', (st?st.tasks.length:'?')+' tasks (was '+n0+')');
    ok(!!st.tasks.find(t=>t.title==='Probe task due today'),'task saved with the typed title');
    ok(!doc.querySelector('.modal-overlay'),'modal closes after submit');
  } else { ok(false,'modal has a title input'); }

  // 4. the checkbox now actually toggles
  await tick(200);
  const td2=panelBy(/Tasks Due/);
  const cb=td2&&td2.querySelector('input[type=checkbox]');
  ok(!!cb,'a due task renders with a checkbox');
  if(cb){
    const doneBefore=store().tasks.filter(t=>t.status==='done').length;
    cb.click(); await tick(300);
    const doneAfter=store().tasks.filter(t=>t.status==='done').length;
    ok(doneAfter===doneBefore+1,'checkbox marks the task done in the store', doneBefore+' -> '+doneAfter);
  }

  // 5. nav buttons actually navigate
  const ps=panelBy(/Pipeline Snapshot/);
  const viewBoard=ps&&Array.from(ps.querySelectorAll('button')).find(b=>/View board/.test(b.textContent||''));
  if(viewBoard){ click(viewBoard); await tick(300);
    ok(/Pipeline/.test(doc.querySelector('.view-title,h1,h2')?.textContent||doc.body.textContent.slice(0,200)),'"View board →" navigates to Pipeline');
  } else ok(false,'"View board" button present');

  ok(errors.length===0,'no uncaught JS errors', errors.slice(0,2).join(' | ')||'clean');
  console.log('\n=== dashboard: '+pass+' passed, '+fail+' failed ===');
  process.exit(fail?1:0);
})();
