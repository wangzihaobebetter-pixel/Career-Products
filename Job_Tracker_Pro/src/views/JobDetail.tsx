import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { useModal } from '../components/Modal';

export default function JobDetail({ id, onBack }:{ id:string; onBack:()=>void }){
  const state = useStore();
  const job = state.jobs.find(j=>j.id===id);
  const [tab, setTab] = useState('overview');

  const co = state.companies.find(c=>c.id===job?.companyId);
  const stage = state.stages.find(s=>s.id===job?.status);
  const interviews = state.interviews.filter(i=>i.jobId===id);
  const notes = state.notes.filter(n=>n.parentId===id);
  const tasks = state.tasks.filter(t=>t.jobId===id);
  const offer = state.offers.find(o=>o.jobId===id);

  const days = useMemo(()=>{
    if(!job) return 0;
    const last = job.stageHistory[job.stageHistory.length-1];
    return last? Math.max(0, Math.round((Date.now()-new Date(last.at).getTime())/86400000)):0;
  },[job]);

  if(!job) return <div className="empty"><div className="e-ico">🔍</div><strong>Job not found</strong></div>;

  const move = (to:string)=>{
    state.moveJob(id, to);
    toast(`Moved to ${state.stages.find(s=>s.id===to)?.label||to}`);
  };

  const TABS = ['overview','pipeline','interviews','tasks','contacts','notes','salary','activity'];

  return (
    <div>
      <button className="btn sm ghost" onClick={onBack}>← Back</button>

      <div className="detail-head">
        <div>
          <h2>{job.title}</h2>
          <div className="muted text-sm">{co?.name||'—'} · {job.remoteType} {job.location?`· ${job.location}`:''}</div>
        </div>
        <div className="flex" style={{gap:8,alignItems:'center'}}>
          <span className="pill" style={{background:(stage?.color||'#666')+'22', color:stage?.color||'#666', fontSize:12.5}}>{stage?.label||job.status}</span>
          <span className={"jc-days"+(days>30?' bad':days>14?' warn':'')} style={{fontSize:12}}>{days}d</span>
        </div>
      </div>

      <div className="detail-meta">
        {job.fitScore!=null&&<span className="chip">fit {job.fitScore}/10</span>}
        {job.salaryMin?<span className="chip">${job.salaryMin>=1000? Math.round(job.salaryMin/1000)+'k':job.salaryMin}{job.salaryMax?`-${job.salaryMax>=1000?Math.round(job.salaryMax/1000)+'k':job.salaryMax}`:''}</span>:null}
        {job.sourceUrl?<a href={job.sourceUrl} target="_blank" rel="noopener" className="chip" style={{textDecoration:'none'}}>Open original ↗</a>:null}
        {job.priority!=='medium'&&<span className="chip">{job.priority} priority</span>}
      </div>

      {/* Stage quick-move */}
      <div className="flex" style={{gap:5,flexWrap:'wrap',marginBottom:14}}>
        <span className="muted text-sm">Move:</span>
        {state.stages.filter(s=>!['wishlist','researching'].includes(s.id as never)).map(s=>(
          <button key={s.id} className={"btn sm"+(job.status===s.id?' primary':'')} onClick={()=>move(s.id)}>{s.label}</button>
        ))}
      </div>

      <div className="tabs">
        {TABS.map(t=><button key={t} className={"tab"+(tab===t?' active':'')} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      {/* ===== Overview ===== */}
      {tab==='overview' && (
        <div className="grid grid-2" style={{alignItems:'start'}}>
          <div className="panel">
            <div className="panel-head"><h3>Job Description</h3></div>
            {job.description? <div className="markdown-body" style={{whiteSpace:'pre-wrap'}}>{job.description}</div>
              : <div className="empty" style={{padding:18}}><div className="e-ico">📋</div><strong>No description saved</strong><p>Paste the full JD for keyword matching.</p></div>}
          </div>
          <div>
            <div className="panel">
              <div className="panel-head"><h3>Details</h3></div>
              <div className="form" style={{gap:8}}>
                <label>Fit score (0-10)<input type="number" min={0} max={10} value={job.fitScore||''} onChange={e=>state.updateJob(id,{fitScore:Number(e.target.value)})} /></label>
                <label>Salary min (annual)<input type="number" value={job.salaryMin||''} onChange={e=>state.updateJob(id,{salaryMin:Number(e.target.value)||undefined})} /></label>
                <label>Salary max<input type="number" value={job.salaryMax||''} onChange={e=>state.updateJob(id,{salaryMax:Number(e.target.value)||undefined})} /></label>
                <label>Priority<select value={job.priority} onChange={e=>state.updateJob(id,{priority:e.target.value as never})}>
                  {['low','medium','high','dream'].map(p=><option key={p}>{p}</option>)}
                </select></label>
                <label>Applied date<input type="date" value={job.appliedDate||''} onChange={e=>state.updateJob(id,{appliedDate:e.target.value||undefined})} /></label>
                <label>Expected response<input type="date" value={job.expectedResponseDate||''} onChange={e=>state.updateJob(id,{expectedResponseDate:e.target.value||undefined})} /></label>
                {job.expectedResponseDate && new Date(job.expectedResponseDate) < new Date() && (
                  <div className="text-sm" style={{color:'var(--bad)'}}>⚠️ Expected response passed — consider follow-up</div>
                )}
              </div>
            </div>
            <div className="panel mt12">
              <div className="panel-head"><h3>Tags</h3></div>
              <div className="flex" style={{gap:5,flexWrap:'wrap'}}>
                {(job.tags||[]).map(t=><span key={t} className="chip">{t}</span>)}
                {(!job.tags||!job.tags.length)&&<span className="muted text-sm">No tags</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Pipeline timeline ===== */}
      {tab==='pipeline' && (
        <div className="panel">
          <div className="panel-head"><h3>Stage History</h3></div>
          <div className="tl">
            {job.stageHistory.slice().reverse().map((h,i)=>{
              const st = state.stages.find(s=>s.id===h.to);
              return (
                <div className="tl-item" key={i}>
                  <span className="tl-dot" style={{background:st?.color||'#666'}}/>
                  <div>
                    <b>{st?.label||h.to}</b> · {new Date(h.at).toLocaleString()}
                    <div className="tl-time">from {h.from} · {h.source}</div>
                    {h.note&&<div className="text-sm">{h.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Interviews ===== */}
      {tab==='interviews' && (
        <div className="panel">
          <div className="panel-head"><h3>Interviews ({interviews.length})</h3>
            <button className="btn sm" onClick={()=>toast('Schedule from Interviews tab')}>+ Add</button></div>
          {interviews.length===0&&<div className="empty" style={{padding:18}}><div className="e-ico">🎤</div><strong>No interviews</strong></div>}
          {interviews.map(iv=>(
            <div className="row" key={iv.id}>
              <span className="r-name">{iv.type.replace(/_/g,' ')}</span>
              <span className="r-sub">{iv.scheduledAt.slice(0,16).replace('T',' ')}</span>
              {iv.interviewerName&&<span className="r-sub">with {iv.interviewerName}</span>}
              <span className="chip">{iv.outcome}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== Tasks ===== */}
      {tab==='tasks' && (
        <div className="panel">
          <div className="panel-head"><h3>Tasks ({tasks.length})</h3><button className="btn sm">+ Add</button></div>
          {tasks.length===0&&<div className="empty" style={{padding:18}}><div className="e-ico">✅</div><strong>No tasks</strong><p>Add follow-ups, thank-you notes, assessments.</p></div>}
          {tasks.map(t=>(
            <div className="row" key={t.id}>
              <input type="checkbox" checked={t.status==='done'} onChange={()=>{}} style={{width:15,height:15}}/>
              <span className="r-name" style={{textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</span>
              {t.dueDate&&<span className="r-date">{t.dueDate.slice(5,10)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ===== Contacts ===== */}
      {tab==='contacts' && (
        <div className="panel">
          <div className="panel-head"><h3>Contacts</h3></div>
          {co && state.contacts.filter(c=>c.companyId===co.id).map(c=>(
            <div className="row" key={c.id}><span className="r-name">{c.name}</span><span className="r-sub">{c.title}</span><span className="chip">{c.relationship}</span></div>
          ))}
          {(!co||state.contacts.filter(c=>c.companyId===co.id).length===0)&&<div className="muted text-sm">No contacts linked to this company</div>}
        </div>
      )}

      {/* ===== Notes ===== */}
      {tab==='notes' && (
        <div className="panel">
          <div className="panel-head"><h3>Notes ({notes.length})</h3><button className="btn sm" onClick={()=>toast('Note composer in full build')}>+ Add</button></div>
          {notes.length===0&&<div className="empty" style={{padding:18}}><div className="e-ico">📝</div><strong>No notes</strong><p>Log call takeaways, follow-up plans.</p></div>}
          {notes.map(n=>(
            <div key={n.id} style={{background:'var(--panel2)',borderRadius:8,padding:10,marginBottom:8,fontSize:13}}>
              {n.body}
              <div className="tl-time">{n.createdAt.slice(0,16).replace('T',' ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Salary ===== */}
      {tab==='salary' && (
        <div className="panel">
          <div className="panel-head"><h3>Salary Offer</h3></div>
          {offer? (
            <div>
              <div className="kpi-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}>
                <div className="kpi"><div className="k-num">${offer.baseSalary? Math.round(offer.baseSalary/1000)+'k':'—'}</div><div className="k-lbl">Base</div></div>
                <div className="kpi"><div className="k-num">${offer.bonus? Math.round(offer.bonus/1000)+'k':'—'}</div><div className="k-lbl">Bonus</div></div>
                <div className="kpi"><div className="k-num">${offer.equityCurrentValue? Math.round(offer.equityCurrentValue/1000)+'k':'—'}</div><div className="k-lbl">Equity</div></div>
              </div>
              <span className="chip">{offer.status}</span>
              {offer.expirationDate&&<span className="chip">expires {offer.expirationDate}</span>}
            </div>
          ): <div className="empty" style={{padding:18}}><div className="e-ico">💰</div><strong>No offer recorded</strong><p>Track salary, bonus, equity, and negotiation history when an offer arrives.</p></div>}
        </div>
      )}

      {/* ===== Activity ===== */}
      {tab==='activity' && (
        <div className="panel">
          <div className="panel-head"><h3>Activity</h3></div>
          <div className="tl">
            {state.activity.filter(a=>a.entityId===id || a.summary.includes(job.title)).slice(0,15).map(a=>(
              <div className="tl-item" key={a.id}>
                <span className="tl-dot" style={{background:'var(--accent)'}}/>
                <div>{a.summary}<div className="tl-time">{a.at.slice(0,16).replace('T',' ')}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
