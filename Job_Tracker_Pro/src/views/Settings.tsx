import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { useModal } from '../components/Modal';
import { DEFAULT_STAGES } from '../store';
import type { ResearchPreview } from '../store';

export default function Settings(){
  const state = useStore();
  const s = state.settings;
  const [name,setName]=useState(s.name); const [email,setEmail]=useState(s.email);
  const [targetRole,setTargetRole]=useState(s.targetRole); const [targetComp,setTargetComp]=useState(s.targetComp);
  const [theme,setTheme]=useState(s.theme); const [relocate,setRelocate]=useState(s.relocate);
  const [importLog,setImportLog]=useState('');

  const save=()=>{
    state.setSettings({ name, email, targetRole, targetComp, theme: theme as never, relocate });
    toast('Settings saved');
  };

  const exportData=()=>{
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup exported');
  };

  const exportCsv=()=>{
    const cols = ['Company','Title','Status','Priority','Fit','Location','Remote','Salary min','Salary max','Source','Applied date','URL'];
    const esc = (v: unknown) => {
      const s = v==null? '' : String(v);
      return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
    };
    const rows = state.jobs.map(j=>{
      const co = state.companies.find(c=>c.id===j.companyId);
      return [co?.name||'', j.title, j.status, j.priority, j.fitScore??'', j.location||'',
              j.remoteType, j.salaryMin??'', j.salaryMax??'', j.source, j.appliedDate||'', j.sourceUrl||''];
    });
    const csv = [cols, ...rows].map(r=>r.map(esc).join(',')).join('\n');
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `job-pipeline-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`Exported ${rows.length} rows to CSV`);
  };

  const importData=()=>{
    const input = document.createElement('input');
    input.type='file'; input.accept='application/json';
    input.onchange = async ()=>{
      const f = input.files?.[0]; if(!f) return;
      try{
        const text = await f.text();
        const data = JSON.parse(text);
        const ok = state.loadBackup(data as never);
        toast(ok
          ? 'Backup restored'
          : 'Not a Job Tracker backup — nothing was changed');
      }catch{ toast('Invalid backup file — nothing was changed'); }
    };
    input.click();
  };

  /* Research JSON is additive market intel, not a snapshot. It is also
     machine-written and uneven, so nothing lands until it has been reviewed. */
  const importResearch=()=>{
    const input = document.createElement('input');
    input.type='file'; input.accept='application/json';
    input.onchange = async ()=>{
      const f = input.files?.[0]; if(!f) return;
      try{
        const raw = JSON.parse(await f.text());
        const pv = state.previewResearch(raw);
        if(!pv.ok){ setImportLog(`✗ ${pv.error}`); toast('Import rejected — nothing changed'); return; }
        const modal = useModal();
        modal.open(<ResearchReview
          preview={pv} fileName={f.name}
          onCancel={()=>{ modal.close(); setImportLog('Import canceled — nothing was changed'); }}
          onConfirm={(keys)=>{
            const r = state.importResearch(raw, keys);
            modal.close();
            setImportLog(r.ok
              ? `✓ ${f.name}: +${r.jobsAdded} roles, +${r.companiesAdded} companies, `+
                `${r.companiesEnriched} enriched, ${r.jobsSkipped} not imported, `+
                `${r.insightsAdded} insights saved as notes.`
              : `✗ ${r.error}`);
            toast(r.ok ? `Imported ${r.jobsAdded} roles` : 'Import failed');
          }} />);
      }catch{ setImportLog('✗ Invalid JSON — nothing was changed'); toast('Invalid file'); }
    };
    input.click();
  };

  const reset=()=>{
    if(confirm('Reset ALL data to fresh state? This cannot be undone.')){
      state.resetAll();
      toast('Data reset');
    }
  };

  return (
    <div className="grid grid-2" style={{alignItems:'start',maxWidth:900}}>
      <div className="panel">
        <div className="panel-head"><h3>Profile</h3></div>
        <div className="form">
          <label>Name<input value={name} onChange={e=>setName(e.target.value)} /></label>
          <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <label>Target role<input value={targetRole} onChange={e=>setTargetRole(e.target.value)} /></label>
          <label>Target comp<input value={targetComp} onChange={e=>setTargetComp(e.target.value)} /></label>
          <label className="chk"><input type="checkbox" checked={relocate} onChange={e=>setRelocate(e.target.checked)}/> Open to relocation</label>
          <label>Theme<select value={theme} onChange={e=>setTheme(e.target.value as typeof theme)}>
            <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
          </select></label>
          <button className="btn primary" onClick={save}>Save Settings</button>
        </div>
      </div>

      <div>
        <div className="panel">
          <div className="panel-head"><h3>Pipeline Stages</h3></div>
          <div className="muted text-sm mb12">Stages are customizable. Current default set:</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {DEFAULT_STAGES.map(st=>(
              <div key={st.id} className="flex" style={{gap:8,fontSize:12.5}}>
                <span className="kan-dot" style={{background:st.color}}/>
                <span>{st.label}</span>
                <span className="muted2" style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:11}}>{st.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Data</h3></div>
          <div className="flex" style={{flexWrap:'wrap',gap:8}}>
            <button className="btn" onClick={exportData}>⬇ Export JSON</button>
            <button className="btn" onClick={exportCsv}>⬇ Export pipeline CSV</button>
            <button className="btn" onClick={importData}>⬆ Import JSON</button>
            <button className="btn danger" onClick={reset}>Reset all</button>
          </div>
          <div className="muted2 text-sm mt12">All data is stored locally in this browser. No telemetry, no backend, no uploads. Export regularly as backup.</div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Import Research</h3></div>
          <div className="muted text-sm mb12">
            Load a market-research JSON (<code>companies</code> / <code>jobs</code> / <code>insights</code>)
            from <code>~/Desktop/Open claw/M3 Research Burn/</code>. This <b>merges</b> — it never
            overwrites a company you have edited, never re-adds a role you already track, and never
            moves anything you have already applied to. New roles arrive in Wishlist.
          </div>
          <button className="btn" onClick={importResearch}>⬆ Import research JSON</button>
          {importLog && <div className="muted2 text-sm mt12" style={{fontFamily:'var(--mono)',fontSize:11.5,lineHeight:1.6}}>{importLog}</div>}
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Storage</h3></div>
          <div className="muted text-sm">localStorage usage estimate: <b>{Math.round(JSON.stringify(state).length/1024)} KB</b> (5 MB limit)</div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>About</h3></div>
          <div className="muted text-sm">Job Tracker Pro v2.0<br/>Spec-driven build: 16 data models, 8 modules (Pipeline / Discovery / Companies / Interview Prep / Materials / Outreach / Stats / Settings).<br/>Keyboard: ⌘K quick switch · ⌘N new job · Esc close</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Research import review — nothing is committed until confirmed.
   Duplicates start unchecked; everything else starts checked.
   ============================================================ */
function ResearchReview({ preview, fileName, onConfirm, onCancel }:{
  preview: ResearchPreview; fileName: string;
  onConfirm:(keys:string[])=>void; onCancel:()=>void;
}){
  const importable = useMemo(()=>preview.jobs.filter(j=>!j.duplicate), [preview.jobs]);
  const [sel, setSel] = useState<Set<string>>(()=>new Set(importable.map(j=>j.key)));
  const [q, setQ] = useState('');

  const shown = preview.jobs.filter(j=>{
    const s=q.trim().toLowerCase();
    return !s || (j.company+' '+j.title).toLowerCase().includes(s);
  });

  const toggle=(k:string)=>setSel(prev=>{
    const n=new Set(prev); n.has(k)?n.delete(k):n.add(k); return n;
  });
  const dupes = preview.jobs.length - importable.length;

  return <div style={{width:'min(880px,86vw)'}}>
    <h3>Review research import</h3>
    <div className="muted text-sm mb12">
      <b>{fileName}</b> — found <b>{preview.jobs.length}</b> roles
      {dupes>0 && <> (<b>{dupes}</b> already in your pipeline, unchecked)</>},
      {' '}<b>{preview.newCompanies.length}</b> new companies,
      {' '}{preview.enrichCompanies} known companies to enrich,
      {' '}{preview.insights} insights.
      <br/>These files are machine-generated: some rows are real postings, some are
      role categories. Uncheck anything that is not a real opening — nothing is
      saved until you press Import.
    </div>

    <div className="toolbar" style={{marginBottom:8}}>
      <input placeholder="Filter…" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
      <button className="btn sm" onClick={()=>setSel(new Set(shown.filter(j=>!j.duplicate).map(j=>j.key)))}>Select shown</button>
      <button className="btn sm" onClick={()=>setSel(new Set())}>Select none</button>
      <span className="muted text-sm"><b>{sel.size}</b> selected</span>
    </div>

    <div style={{maxHeight:'46vh',overflow:'auto',border:'1px solid var(--border)',borderRadius:8}}>
      {shown.map(j=>(
        <label key={j.key} className="row" style={{cursor:'pointer',opacity:j.duplicate?0.55:1}}>
          <input type="checkbox" checked={sel.has(j.key)} onChange={()=>toggle(j.key)} />
          <span className="r-name">{j.title}
            <span className="r-sub"> · {j.company}{j.newCompany?' (new)':''}</span>
          </span>
          {j.location && <span className="r-sub">{j.location}</span>}
          {j.salaryMin ? <span className="r-sub">${(j.salaryMin/1000).toFixed(0)}k{j.salaryMax?`–$${(j.salaryMax/1000).toFixed(0)}k`:''}</span> : null}
          {typeof j.fitScore==='number' && <span className="chip">fit {j.fitScore}</span>}
          {j.duplicate && <span className="chip">already tracked</span>}
        </label>
      ))}
      {shown.length===0 && <div className="empty"><strong>Nothing matches that filter</strong></div>}
    </div>

    <div className="modal-actions">
      <button className="btn ghost" onClick={onCancel}>Cancel</button>
      <button className="btn primary" disabled={sel.size===0} onClick={()=>onConfirm([...sel])}>
        Import {sel.size} role{sel.size===1?'':'s'}
      </button>
    </div>
  </div>;
}
