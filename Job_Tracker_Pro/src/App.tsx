import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from './store';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import Companies from './views/Companies';
import Contacts from './views/Contacts';
import Interviews from './views/Interviews';
import Offers from './views/Offers';
import Resume from './views/Resume';
import Tailor from './views/Tailor';
import Templates from './views/Templates';
import Questions from './views/Questions';
import Intel from './views/Intel';
import Openings from './views/Openings';
import Sequences from './views/Sequences';
import Actions from './views/Actions';
import Playbook from './views/Playbook';
import Stats from './views/Stats';
import Settings from './views/Settings';
import JobDetail from './views/JobDetail';
import CompanyDetail from './views/CompanyDetail';
import { QuickSwitcher, type QSResult } from './components/QuickSwitcher';
import { CommandPalette, type Command } from './components/CommandPalette';
import { ModalHost, useModal } from './components/Modal';
import { toast, ToastHost } from './components/Toast';
import { buildICS, downloadICS, countEvents } from './lib/ics';
import { needsAttention } from './lib/followups';

type View = 'dashboard'|'openings'|'pipeline'|'companies'|'contacts'|'interviews'|'offers'|'resume'|'tailor'|'templates'|'questions'|'sequences'|'intel'|'actions'|'playbook'|'stats'|'settings';

const NAV: { view: View; label: string; ico: string; sec?: string }[] = [
  { view:'dashboard', label:'Dashboard', ico:'📊' },
  { view:'openings', label:'Live Openings', ico:'🛰' },
  { view:'pipeline', label:'Pipeline', ico:'🗂' },
  { view:'companies', label:'Companies', ico:'🏢' },
  { view:'contacts', label:'Contacts', ico:'👥', sec:'Network' },
  { view:'interviews', label:'Interviews', ico:'🎤' },
  { view:'offers', label:'Offers', ico:'💰' },
  { view:'resume', label:'Resume & Bullets', ico:'📄', sec:'Materials' },
  { view:'tailor', label:'Tailor to JD', ico:'🎯' },
  { view:'templates', label:'Email Templates', ico:'✉️' },
  { view:'questions', label:'Interview Prep', ico:'❓' },
  { view:'sequences', label:'Outreach Sequences', ico:'📨' },
  { view:'intel', label:'Company Intel', ico:'🔎' },
  { view:'actions', label:'Action Board', ico:'✅', sec:'Insights' },
  { view:'playbook', label:'90-Day Playbook', ico:'🗺' },
  { view:'stats', label:'Stats', ico:'📈' },
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  /* On a phone the 17-item sidebar cannot sit next to the content, so it becomes
     an off-canvas drawer. The state lives here rather than in CSS-only form
     because picking a view has to close it — otherwise you tap "Pipeline" and
     still stare at the menu. */
  const [navOpen, setNavOpen] = useState(false);

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
      const mod = e.metaKey||e.ctrlKey;
      // ⌘⇧P before ⌘K: on some layouts shift changes e.key, so test it first.
      if(mod && e.shiftKey && e.key.toLowerCase()==='p'){ e.preventDefault(); setPaletteOpen(o=>!o); return; }
      if(mod && e.key.toLowerCase()==='k'){ e.preventDefault(); setQsOpen(o=>!o); setQsQuery(''); setQsSel(0); return; }
      if(mod && e.key.toLowerCase()==='n'){ e.preventDefault(); openQuickAdd(); return; }
      if(mod && !e.shiftKey && e.key.toLowerCase()==='z'){
        // Only intercept undo when the user isn't typing — otherwise we'd
        // break native text undo inside every form in the app.
        const el = document.activeElement as HTMLElement|null;
        const typing = !!el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA' || el.isContentEditable);
        if(typing) return;
        e.preventDefault();
        const label = state.undoLast();
        toast(label ? `Reverted: ${label}` : 'Nothing to undo');
        return;
      }
      if(e.key==='Escape'){ setQsOpen(false); setPaletteOpen(false); setNavOpen(false); }
    };
    window.addEventListener('keydown', h);
    return ()=>window.removeEventListener('keydown', h);
  },[qsOpen, state]);

  const openQuickAdd = ()=>{
    const modal = useModal();
    modal.open(<QuickAddForm onDone={()=>{modal.close(); toast('Job added');}} />);
  };

  const counts = {
    pipeline: state.jobs.filter(j=>!['rejected','ghosted','withdrawn','accepted'].includes(j.status)).length,
    companies: state.companies.length,
    contacts: state.contacts.length,
    actions: state.tasks.filter(t=>t.status!=='done').length,
    offers: state.offers.length,
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

  /* ---- Command palette actions (⌘⇧P) ----
     Everything here is reachable by mouse too; the palette is a faster
     path, never the only path. */
  const commands: Command[] = useMemo(()=>{
    const go: Command[] = NAV.map(n=>({
      id:'go:'+n.view, group:'Go to', label:n.label, hint:'⌘K also jumps to records',
      run:()=>{ setView(n.view); setDetailJob(null); setDetailCompany(null); },
    }));

    const actions: Command[] = [
      { id:'act:new', group:'Create', label:'New job…', hint:'⌘N', run:openQuickAdd },
      { id:'act:undo', group:'Edit', label:'Undo last change', hint:'⌘Z', run:()=>{
        const l = state.undoLast(); toast(l? `Reverted: ${l}` : 'Nothing to undo');
      }},
      { id:'act:theme', group:'View', label:`Switch to ${state.settings.theme==='dark'?'light':'dark'} theme`, run:()=>{
        const next = state.settings.theme==='dark'?'light':'dark';
        state.setSettings({ theme: next }); toast(`${next} theme`);
      }},
      { id:'act:ics', group:'Export', label:'Export interviews to .ics', run:()=>{
        const ics = buildICS(state.interviews, { jobs:state.jobs, companies:state.companies });
        const n = countEvents(ics);
        if(!n){ toast('No interviews to export'); return; }
        downloadICS('job-tracker-interviews.ics', ics);
        toast(`Exported ${n} event${n===1?'':'s'}`);
      }},
      { id:'act:json', group:'Export', label:'Export full backup (JSON)', run:()=>{
        const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click(); toast('Backup exported');
      }},
      { id:'act:attention', group:'Go to', label:'Show jobs that need attention',
        hint:`${state.jobs.filter(j=>!j.archived && needsAttention(j)).length} flagged`,
        run:()=>{ setView('actions'); setDetailJob(null); setDetailCompany(null); }},
    ];

    return [...actions, ...go];
  },[state]);

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
      case 'dashboard': return <Dashboard
        onOpenJob={setDetailJob}
        onOpenCompany={setDetailCompany}
        onNavigate={(v)=>{ setView(v as View); setDetailJob(null); setDetailCompany(null); }}
      />;
      case 'pipeline': return <Pipeline onOpenJob={(id)=>setDetailJob(id)} />;
      case 'companies': return <Companies onOpen={(id)=>setDetailCompany(id)} />;
      case 'contacts': return <Contacts />;
      case 'interviews': return <Interviews />;
      case 'offers': return <Offers />;
      case 'resume': return <Resume />;
      case 'tailor': return <Tailor />;
      case 'templates': return <Templates />;
      case 'questions': return <Questions />;
      case 'sequences': return <Sequences />;
      case 'intel': return <Intel />;
      case 'openings': return <Openings />;
      case 'actions': return <Actions />;
      case 'playbook': return <Playbook />;
      case 'stats': return <Stats />;
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className={"app"+(navOpen?' nav-open':'')}>
      <aside className={"sidebar"+(navOpen?' open':'')} id="app-nav">
        <div className="brand">
          <span className="logo">🗂</span>
          <div><div className="name">Job Tracker Pro</div><div className="sub">local-first · private</div></div>
        </div>
        {NAV.map((n,i)=>{
          const prev = i>0?NAV[i-1]:null;
          return <React.Fragment key={n.view}>
            {n.sec && (!prev || prev.sec!==n.sec) && <div className="nav-sec">{n.sec}</div>}
            <button className={"nav-item"+(view===n.view&&!detailJob&&!detailCompany?' active':'')}
              aria-current={view===n.view&&!detailJob&&!detailCompany ? 'page' : undefined}
              onClick={()=>{setView(n.view); setDetailJob(null); setDetailCompany(null); setNavOpen(false);}}>
              <span className="ico">{n.ico}</span>{n.label}
              {counts[n.view as keyof typeof counts] ? <span className="cnt">{counts[n.view as keyof typeof counts]}</span>:null}
            </button>
          </React.Fragment>;
        })}
        <div className="foot">Data stays on this device<br/>v2.0 · spec-driven build</div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="tb-btn nav-toggle" aria-label={navOpen?'Close menu':'Open menu'}
            aria-expanded={navOpen} aria-controls="app-nav"
            onClick={()=>setNavOpen(o=>!o)}>☰</button>
          <button className="tb-btn" aria-label="Search records" onClick={()=>setQsOpen(true)}>🔍 <span className="kbd">⌘K</span></button>
          <button className="tb-btn palette-btn" aria-label="Command palette" data-testid="open-palette" onClick={()=>setPaletteOpen(true)}>⌘ <span className="kbd">⇧P</span></button>
          <div className="title">
            {detailJob? 'Job Detail' : detailCompany? 'Company Detail' : NAV.find(n=>n.view===view)?.label}
          </div>
          <button className="tb-btn" onClick={openQuickAdd}>＋ <span className="lbl">New</span></button>
          <span className={"saving-ind"+(saving?' saved':'')}><span className="dot"/>{saving?'Saving…':'Saved'}</span>
        </div>
        <div className="content">{renderView()}</div>
      </main>

      {/* Tapping outside the drawer closes it — the expected gesture on a phone,
          and the only way out if the menu opens over a scrolled view. */}
      {navOpen && <div className="scrim" onClick={()=>setNavOpen(false)} aria-hidden="true" />}

      {qsOpen && <QuickSwitcher query={qsQuery} setQuery={setQsQuery} results={qsResults} sel={qsSel} setSel={setQsSel}
        onPick={handleQsPick} onClose={()=>setQsOpen(false)} />}
      {paletteOpen && <CommandPalette commands={commands} onClose={()=>setPaletteOpen(false)} />}
      <ModalHost />
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
