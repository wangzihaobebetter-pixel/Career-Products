import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from './store';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import Companies from './views/Companies';
import Contacts from './views/Contacts';
import Interviews from './views/Interviews';
import Resume from './views/Resume';
import Templates from './views/Templates';
import Questions from './views/Questions';
import Stats from './views/Stats';
import Settings from './views/Settings';
import JobDetail from './views/JobDetail';
import CompanyDetail from './views/CompanyDetail';
import { QuickSwitcher, type QSResult } from './components/QuickSwitcher';
import { Modal, useModal } from './components/Modal';
import { toast, ToastHost } from './components/Toast';

type View = 'dashboard'|'pipeline'|'companies'|'contacts'|'interviews'|'resume'|'templates'|'questions'|'stats'|'settings';

const NAV: { view: View; label: string; ico: string; sec?: string }[] = [
  { view:'dashboard', label:'Dashboard', ico:'📊' },
  { view:'pipeline', label:'Pipeline', ico:'🗂' },
  { view:'companies', label:'Companies', ico:'🏢' },
  { view:'contacts', label:'Contacts', ico:'👥', sec:'Network' },
  { view:'interviews', label:'Interviews', ico:'🎤' },
  { view:'resume', label:'Resume & Bullets', ico:'📄', sec:'Materials' },
  { view:'templates', label:'Email Templates', ico:'✉️' },
  { view:'questions', label:'Interview Prep', ico:'❓' },
  { view:'stats', label:'Stats', ico:'📈', sec:'Insights' },
  { view:'settings', label:'Settings', ico:'⚙️' },
];

export default function App(){
  const state = useStore();
  const [view, setView] = useState<View>('dashboard');
  const [detailJob, setDetailJob] = useState<string|null>(null);
  const [detailCompany, setDetailCompany] = useState<string|null>(null);
  const [qsOpen, setQsOpen] = useState(false);
  const [qsQuery, setQsQuery] = useState('');
  const [qsSel, setQsSel] = useState(0);
  const [saving, setSaving] = useState(false);

  // Apply theme
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', state.settings.theme==='system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')
      : state.settings.theme);
  },[state.settings.theme]);

  // Saving indicator (persist middleware auto-saves; simulate pulse)
  useEffect(()=>{
    setSaving(true);
    const t = setTimeout(()=>setSaving(false), 400);
    return ()=>clearTimeout(t);
  },[state.savedAt]);

  // Keyboard shortcuts
  useEffect(()=>{
    const h = (e: KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setQsOpen(o=>!o); setQsQuery(''); setQsSel(0); }
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='n'){ e.preventDefault(); openQuickAdd(); }
      if(e.key==='Escape'){ setQsOpen(false); }
      if(!qsOpen && !e.metaKey && !e.ctrlKey && e.key==='g'){
        // g + key nav
        const k = e.key;
        if(k==='g') return;
      }
    };
    window.addEventListener('keydown', h);
    return ()=>window.removeEventListener('keydown', h);
  },[qsOpen]);

  const openQuickAdd = ()=>{
    const modal = useModal();
    modal.open(<QuickAddForm onDone={()=>{modal.close(); toast('Job added');}} />);
  };

  const counts = {
    pipeline: state.jobs.filter(j=>!['rejected','ghosted','withdrawn','accepted'].includes(j.status)).length,
    companies: state.companies.length,
    contacts: state.contacts.length,
  };

  // Quick switcher results
  const qsResults = (()=>{
    const q = qsQuery.toLowerCase().trim();
    if(!q) return [];
    const out: {type:string; label:string; sub:string; id:string; view:View}[] = [];
    state.jobs.filter(j=>!q || (j.title+' '+j.companyId).toLowerCase().includes(q)).slice(0,6).forEach(j=>{
      out.push({ type:'job', label:j.title, sub:state.companies.find(c=>c.id===j.companyId)?.name||'', id:j.id, view:'pipeline' });
    });
    state.companies.filter(c=>!q || c.name.toLowerCase().includes(q)).slice(0,6).forEach(c=>{
      out.push({ type:'company', label:c.name, sub:c.industry||'', id:c.id, view:'companies' });
    });
    state.contacts.filter(c=>!q || c.name.toLowerCase().includes(q)).slice(0,5).forEach(c=>{
      out.push({ type:'contact', label:c.name, sub:c.title||'', id:c.id, view:'contacts' });
    });
    state.templates.filter(t=>!q || (t.name+' '+t.category).toLowerCase().includes(q)).slice(0,4).forEach(t=>{
      out.push({ type:'template', label:t.name, sub:t.category, id:t.id, view:'templates' });
    });
    return out.slice(0,12);
  })();

  const handleQsPick = (r: QSResult)=>{
    setQsOpen(false); setView(r.view as View);
    if(r.view==='pipeline') setDetailJob(r.id);
    if(r.view==='companies') setDetailCompany(r.id);
    if(r.view==='contacts') setView('contacts');
    if(r.view==='templates') setView('templates');
  };

  const renderView = ()=>{
    if(detailJob) return <JobDetail id={detailJob} onBack={()=>setDetailJob(null)} />;
    if(detailCompany) return <CompanyDetail id={detailCompany} onBack={()=>setDetailCompany(null)} />;
    switch(view){
      case 'dashboard': return <Dashboard onOpenJob={setDetailJob} onOpenCompany={setDetailCompany} />;
      case 'pipeline': return <Pipeline onOpenJob={(id)=>setDetailJob(id)} />;
      case 'companies': return <Companies onOpen={(id)=>setDetailCompany(id)} />;
      case 'contacts': return <Contacts />;
      case 'interviews': return <Interviews />;
      case 'resume': return <Resume />;
      case 'templates': return <Templates />;
      case 'questions': return <Questions />;
      case 'stats': return <Stats />;
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">🗂</span>
          <div><div className="name">Job Tracker Pro</div><div className="sub">local-first · private</div></div>
        </div>
        {NAV.map((n,i)=>{
          const prev = i>0?NAV[i-1]:null;
          return <React.Fragment key={n.view}>
            {n.sec && (!prev || prev.sec!==n.sec) && <div className="nav-sec">{n.sec}</div>}
            <button className={"nav-item"+(view===n.view&&!detailJob&&!detailCompany?' active':'')}
              onClick={()=>{setView(n.view); setDetailJob(null); setDetailCompany(null);}}>
              <span className="ico">{n.ico}</span>{n.label}
              {counts[n.view as keyof typeof counts] ? <span className="cnt">{counts[n.view as keyof typeof counts]}</span>:null}
            </button>
          </React.Fragment>;
        })}
        <div className="foot">Data stays on this device<br/>v2.0 · spec-driven build</div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="tb-btn" onClick={()=>setQsOpen(true)}>🔍 <span className="kbd">⌘K</span></button>
          <div className="title">
            {detailJob? 'Job Detail' : detailCompany? 'Company Detail' : NAV.find(n=>n.view===view)?.label}
          </div>
          <button className="tb-btn" onClick={openQuickAdd}>＋ New</button>
          <span className={"saving-ind"+(saving?' saved':'')}><span className="dot"/>{saving?'Saving…':'Saved'}</span>
        </div>
        <div className="content">{renderView()}</div>
      </main>

      {qsOpen && <QuickSwitcher query={qsQuery} setQuery={setQsQuery} results={qsResults} sel={qsSel} setSel={setQsSel}
        onPick={handleQsPick} onClose={()=>setQsOpen(false)} />}
      <ToastHost />
    </div>
  );
}

/* ---- Quick Add Job modal ---- */
import { useStore as useStoreHook } from './store';
import type { JobApplication } from './types';

function QuickAddForm({ onDone }:{ onDone:()=>void }){
  const store = useStoreHook();
  const companies = store.companies;
  const [title,setTitle]=useState('');
  const [companyId,setCompanyId]=useState(companies[0]?.id||'');
  const [url,setUrl]=useState('');
  const [source,setSource]=useState('linkedin');

  const submit = ()=>{
    if(!title.trim()){ toast('Title required'); return; }
    store.addJob({ title:title.trim(), companyId, sourceUrl:url||undefined, source:source as JobApplication['source'], status:'wishlist' });
    onDone();
  };

  return <div>
    <h3>Add Job</h3>
    <div className="form">
      <label>Title<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Data Analyst, Growth" onKeyDown={e=>e.key==='Enter'&&submit()} /></label>
      <label>Company<select value={companyId} onChange={e=>setCompanyId(e.target.value)}>
        {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="">(custom)</option>
      </select></label>
      <label>URL<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste LinkedIn / Wellfound / BuiltIn URL" /></label>
      <label>Source<select value={source} onChange={e=>setSource(e.target.value)}>
        {['linkedin','indeed','wellfound','builtin','glassdoor','company_site','referral','cold','other'].map(s=><option key={s}>{s}</option>)}
      </select></label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add Job</button>
      </div>
    </div>
  </div>;
}
