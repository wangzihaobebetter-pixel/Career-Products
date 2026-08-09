import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { useModal } from '../components/Modal';
import type { JobApplication, StageId } from '../types';

function daysInStage(j: JobApplication): number {
  const last = j.stageHistory[j.stageHistory.length-1];
  if(!last) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(last.at).getTime())/86400000));
}

export default function Pipeline({ onOpenJob }:{ onOpenJob:(id:string)=>void }){
  const state = useStore();
  const [mode, setMode] = useState<'kanban'|'list'|'table'>('kanban');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyStuck, setOnlyStuck] = useState(false);
  const [dragId, setDragId] = useState<string|null>(null);
  const [overCol, setOverCol] = useState<string|null>(null);

  const jobs = useMemo(()=>{
    let list = state.jobs.filter(j=>!j.archived);
    const t = q.toLowerCase().trim();
    if(t) list = list.filter(j=>{
      const co = state.companies.find(c=>c.id===j.companyId);
      return (j.title+' '+(co?.name||'')+' '+(j.description||'')).toLowerCase().includes(t);
    });
    if(statusFilter) list = list.filter(j=>j.status===statusFilter);
    if(onlyStuck) list = list.filter(j=>daysInStage(j)>14);
    return list;
  },[state.jobs, state.companies, q, statusFilter, onlyStuck]);

  const activeStages = state.stages.filter(st=>!['rejected','ghosted','withdrawn','accepted'].includes(st.id as never));

  const handleDrop = (to: StageId)=>{
    if(dragId){
      state.moveJob(dragId, to as string);
      toast(`Moved to ${state.stages.find(s=>s.id===to)?.label||to}`);
      setDragId(null); setOverCol(null);
    }
  };

  const quickAdd = (stage?: StageId)=>{
    const modal = useModal();
    modal.open(<QuickAddModal stage={stage} onDone={()=>{modal.close(); toast('Job added');}} />);
  };

  /* ================= Kanban ================= */
  if(mode==='kanban'){
    return (
      <div>
        <div className="toolbar">
          <input className="search" placeholder="Search title, company, description…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="">All stages</option>
            {state.stages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <label className="flex text-sm" style={{gap:5}}><input type="checkbox" checked={onlyStuck} onChange={e=>setOnlyStuck(e.target.checked)}/> Stuck only</label>
          <div className="flex" style={{gap:4}}>
            {(['kanban','list','table'] as const).map(m=>(
              <button key={m} className={"btn sm"+(mode===m?' primary':'')} onClick={()=>setMode(m)}>{m}</button>
            ))}
          </div>
          <button className="btn sm" onClick={()=>quickAdd()}>＋ Add</button>
          <span className="muted text-sm">{jobs.length} jobs</span>
        </div>

        <div className="kanban">
          {activeStages.map(st=>{
            const colJobs = jobs.filter(j=>j.status===st.id).sort((a,b)=>b.lastTouchedAt.localeCompare(a.lastTouchedAt));
            return (
              <div key={st.id} className={"kan-col"+(overCol===st.id?' over':'')}
                onDragOver={e=>{e.preventDefault(); setOverCol(st.id);}}
                onDragLeave={()=>setOverCol(null)}
                onDrop={e=>{e.preventDefault(); handleDrop(st.id);}}>
                <div className="kan-head">
                  <span className="kan-dot" style={{background:st.color}}/>
                  <span>{st.label}</span>
                  <span className="kan-count">{colJobs.length}</span>
                  <button className="kan-add" onClick={()=>quickAdd(st.id)} title="Add job here">＋</button>
                </div>
                <div className="kan-body">
                  {colJobs.length===0 && <div className="empty" style={{padding:'16px 8px',fontSize:'11.5px'}}>Drop here</div>}
                  {colJobs.map(j=>{
                    const co = state.companies.find(c=>c.id===j.companyId);
                    const d = daysInStage(j);
                    return (
                      <div key={j.id} className={"job-card"+(dragId===j.id?' dragging':'')} draggable
                        onDragStart={e=>{setDragId(j.id); e.dataTransfer.effectAllowed='move';}}
                        onDragEnd={()=>{setDragId(null); setOverCol(null);}}
                        onClick={()=>onOpenJob(j.id)}>
                        <div className="jc-top">
                          <span className="jc-company">{co?.name||'—'}</span>
                          {j.priority==='dream'&&<span className="star">⭐</span>}
                          {j.priority==='high'&&<span style={{color:'var(--warn)'}}>🔴</span>}
                        </div>
                        <div className="jc-title">{j.title}</div>
                        <div className="jc-meta">
                          {j.salaryMin? <span className="chip">{j.salaryMin>=1000? '$'+(j.salaryMin/1000)+'k':j.salaryMin}</span>:null}
                          {j.fitScore? <span className="chip">fit {j.fitScore}/10</span>:null}
                          {j.remoteType!=='onsite'&&<span className="chip">{j.remoteType}</span>}
                        </div>
                        <div className="jc-foot">
                          <span className={"jc-days"+(d>30?' bad':d>14?' warn':'')}>{d>0? d+'d in stage':''}</span>
                          <span>{j.lastTouchedAt.slice(5,10)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ================= List ================= */
  if(mode==='list'){
    return (
      <div>
        <div className="toolbar">
          <input className="search" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="flex" style={{gap:4}}>
            {(['kanban','list','table'] as const).map(m=>(
              <button key={m} className={"btn sm"+(mode===m?' primary':'')} onClick={()=>setMode(m)}>{m}</button>
            ))}
          </div>
          <span className="muted text-sm">{jobs.length} jobs</span>
        </div>
        <div className="panel" style={{padding:0,overflow:'hidden'}}>
          {jobs.sort((a,b)=>b.lastTouchedAt.localeCompare(a.lastTouchedAt)).map(j=>{
            const co = state.companies.find(c=>c.id===j.companyId);
            const st = state.stages.find(s=>s.id===j.status);
            return (
              <div className="row clickable" key={j.id} onClick={()=>onOpenJob(j.id)}>
                <span className="r-name" style={{flex:'2'}}>{j.title} <span className="r-sub">· {co?.name||''}</span></span>
                <span className="r-sub" style={{flex:1}}>{j.remoteType} {j.fitScore?`· fit ${j.fitScore}`:''}</span>
                <span className="pill" style={{background:(st?.color||'#666')+'22', color:st?.color||'#666'}}>{st?.label||j.status}</span>
                <span className="r-date">{daysInStage(j)}d</span>
              </div>
            );
          })}
          {jobs.length===0 && <div className="empty"><div className="e-ico">🔍</div><strong>No jobs match</strong><p>Adjust filters or add a job.</p></div>}
        </div>
      </div>
    );
  }

  /* ================= Table ================= */
  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="flex" style={{gap:4}}>
          {(['kanban','list','table'] as const).map(m=>(
            <button key={m} className={"btn sm"+(mode===m?' primary':'')} onClick={()=>setMode(m)}>{m}</button>
          ))}
        </div>
        <span className="muted text-sm">{jobs.length} jobs</span>
      </div>
      <div className="panel" style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12.5px'}}>
          <thead><tr style={{color:'var(--muted)',textAlign:'left'}}>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Role</th>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Company</th>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Stage</th>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Fit</th>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Remote</th>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>Days</th>
          </tr></thead>
          <tbody>
            {jobs.sort((a,b)=>b.lastTouchedAt.localeCompare(a.lastTouchedAt)).map(j=>{
              const co = state.companies.find(c=>c.id===j.companyId);
              const st = state.stages.find(s=>s.id===j.status);
              return (
                <tr key={j.id} style={{borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>onOpenJob(j.id)}>
                  <td style={{padding:'8px 12px'}}>{j.title}</td>
                  <td style={{padding:'8px 12px'}}>{co?.name||''}</td>
                  <td style={{padding:'8px 12px'}}><span className="pill" style={{background:(st?.color||'#666')+'22', color:st?.color||'#666'}}>{st?.label||j.status}</span></td>
                  <td style={{padding:'8px 12px'}}>{j.fitScore||'—'}</td>
                  <td style={{padding:'8px 12px'}}>{j.remoteType}</td>
                  <td style={{padding:'8px 12px'}}>{daysInStage(j)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Quick Add modal ================= */
function QuickAddModal({ stage, onDone }:{ stage?: StageId; onDone:()=>void }){
  const state = useStore();
  const [title,setTitle]=useState('');
  const [companyId,setCompanyId]=useState(state.companies[0]?.id||'');
  const [url,setUrl]=useState('');
  const [source,setSource]=useState('linkedin');
  const [remoteType,setRemoteType]=useState('remote');

  const submit=()=>{
    if(!title.trim()){ toast('Title required'); return; }
    state.addJob({ title:title.trim(), companyId, sourceUrl:url||undefined, source:source as JobApplication['source'], remoteType:remoteType as JobApplication['remoteType'], status:stage||'wishlist' });
    onDone();
  };

  return <div>
    <h3>Add Job{stage?` → ${state.stages.find(s=>s.id===stage)?.label||''}`:''}</h3>
    <div className="form">
      <label>Title<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Data Analyst, Growth" onKeyDown={e=>e.key==='Enter'&&submit()} /></label>
      <label>Company<select value={companyId} onChange={e=>setCompanyId(e.target.value)}>
        {state.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="">(custom)</option>
      </select></label>
      <label>URL<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste job URL" /></label>
      <div className="flex" style={{gap:8}}>
        <label style={{flex:1}}>Source<select value={source} onChange={e=>setSource(e.target.value)}>
          {['linkedin','indeed','wellfound','builtin','glassdoor','company_site','referral','cold','other'].map(s=><option key={s}>{s}</option>)}
        </select></label>
        <label style={{flex:1}}>Remote<select value={remoteType} onChange={e=>setRemoteType(e.target.value)}>
          {['onsite','hybrid','remote','anywhere'].map(s=><option key={s}>{s}</option>)}
        </select></label>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add Job</button>
      </div>
    </div>
  </div>;
}
