import React, { useMemo } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { JobApplication } from '../types';

function daysInStage(j: JobApplication): number {
  const last = j.stageHistory[j.stageHistory.length-1];
  if(!last) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(last.at).getTime())/86400000));
}

export default function Dashboard({ onOpenJob, onOpenCompany }:{ onOpenJob:(id:string)=>void; onOpenCompany:(id:string)=>void }){
  const state = useStore();
  const s = useMemo(()=>state, [state.savedAt]);

  const active = s.jobs.filter(j=>!['rejected','ghosted','withdrawn','accepted'].includes(j.status));
  const applied = s.jobs.filter(j=>['applied','phone_screen','technical','onsite','final','offer','negotiating'].includes(j.status));
  const interviews = s.interviews.filter(i=>new Date(i.scheduledAt) >= new Date()).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)).slice(0,5);
  const offers = s.jobs.filter(j=>['offer','negotiating','accepted'].includes(j.status));
  const tasksToday = s.tasks.filter(t=>t.status!=='done' && (!t.dueDate || t.dueDate <= new Date(Date.now()+86400000).toISOString().slice(0,10)));
  const stuck = active.filter(j=>daysInStage(j)>14);
  const pipelineValue = offers.reduce((sum,o)=> sum + (o.salaryMin||0), 0);

  const funnel = useMemo(()=>{
    const stages = s.stages.filter(st=>!['rejected','ghosted','withdrawn','accepted'].includes(st.id as never));
    return stages.map(st=>({ ...st, count: s.jobs.filter(j=>j.status===st.id).length }));
  },[s.jobs, s.stages]);

  const toggleTask = (id:string)=>{
    const t = s.tasks.find(x=>x.id===id); if(!t) return;
    // store lacks task actions; patch via local state approach — use setSettings-like trick
    // For now, use a custom reducer via addActivity + direct mutation through updateJob pattern:
    // We'll add a lightweight store patch by reusing updateJob? No — tasks need their own action.
    // Minimal: store tasks in state; add actions in store. We'll implement inline below.
  };

  return (
    <div>
      {/* KPI row */}
      <div className="kpi-row">
        <div className="kpi"><div className="k-num">{active.length}</div><div className="k-lbl">Active applications</div><div className="k-sub">{applied.length} applied+</div></div>
        <div className="kpi"><div className="k-num">{interviews.length}</div><div className="k-lbl">Upcoming interviews</div><div className="k-sub">next 7 days</div></div>
        <div className="kpi"><div className="k-num">{offers.length}</div><div className="k-lbl">Open offers</div><div className="k-sub">${pipelineValue>=1000?Math.round(pipelineValue/1000)+'k':pipelineValue} pipeline</div></div>
        <div className="kpi"><div className="k-num">{tasksToday.length}</div><div className="k-lbl">Tasks today</div><div className="k-sub">{stuck.length} stuck</div></div>
        <div className="kpi"><div className="k-num">{s.companies.length}</div><div className="k-lbl">Target companies</div><div className="k-sub">{s.contacts.length} contacts</div></div>
      </div>

      <div className="grid grid-2">
        {/* Left column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Today's tasks */}
          <div className="panel">
            <div className="panel-head"><h3>Today's Tasks</h3><button className="btn sm ghost" onClick={()=>toast('Task add coming in full build')}>+ Add</button></div>
            {tasksToday.length===0 && <div className="empty"><div className="e-ico">🎉</div><strong>All clear</strong><p>No tasks due today. Time to send cold outreach?</p></div>}
            {tasksToday.slice(0,6).map(t=>(
              <div className="row clickable" key={t.id}>
                <input type="checkbox" checked={t.status==='done'} onChange={()=>{}} style={{width:15,height:15}} />
                <span className="r-name" style={{textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</span>
                {t.priority==='urgent' && <span style={{color:'var(--bad)'}}>🔴</span>}
                {t.priority==='high' && <span style={{color:'var(--warn)'}}>⚠️</span>}
                {t.dueDate && <span className="r-date">{t.dueDate.slice(5)}</span>}
              </div>
            ))}
          </div>

          {/* Upcoming interviews */}
          <div className="panel">
            <div className="panel-head"><h3>Upcoming Interviews</h3></div>
            {interviews.length===0 && <div className="empty"><div className="e-ico">🎤</div><strong>No interviews scheduled</strong><p>Your pipeline is early-stage — keep applying.</p></div>}
            {interviews.map(iv=>{
              const job = s.jobs.find(j=>j.id===iv.jobId);
              const co = s.companies.find(c=>c.id===job?.companyId);
              return <div className="row clickable" key={iv.id}>
                <span style={{color:'var(--accent)'}}>📅</span>
                <span className="r-name">{iv.type.replace(/_/g,' ')} <span className="r-sub">· {co?.name||''}</span></span>
                <span className="r-date">{iv.scheduledAt.slice(5,16).replace('T',' ')}</span>
              </div>;
            })}
          </div>

          {/* Recent activity */}
          <div className="panel">
            <div className="panel-head"><h3>Recent Activity</h3></div>
            {s.activity.slice(0,8).map(a=>(
              <div className="row" key={a.id}>
                <span style={{fontSize:11,color:'var(--muted2)',minWidth:56}}>{a.at.slice(5,16).replace('T',' ')}</span>
                <span className="r-name">{a.summary}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Pipeline snapshot */}
          <div className="panel">
            <div className="panel-head"><h3>Pipeline Snapshot</h3><a className="text-sm" href="#" onClick={e=>e.preventDefault()}>View board →</a></div>
            <div className="funnel">
              {funnel.map(st=>(
                <div className="funnel-row" key={st.id}>
                  <span className="f-label">{st.label}</span>
                  <div className="f-bar"><div className="f-fill" style={{width: st.count? Math.max(6, st.count/ Math.max(1, s.jobs.length) *100):0+'%', background:st.color}}/></div>
                  <span className="f-num">{st.count}</span>
                </div>
              ))}
            </div>
            {stuck.length>0 && <div className="mt8 text-sm" style={{color:'var(--warn)'}}>⚠️ {stuck.length} applications stuck &gt;14 days — consider follow-up</div>}
          </div>

          {/* Top companies */}
          <div className="panel">
            <div className="panel-head"><h3>Top Target Companies</h3></div>
            {s.companies.slice().sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,8).map(c=>(
              <div className="row clickable" key={c.id} onClick={()=>onOpenCompany(c.id)}>
                <span className="rank-chip">#{c.rank||'—'}</span>
                <span className="r-name">{c.name}</span>
                <span className="r-sub">{c.industry||''}</span>
                <b style={{fontSize:12}}>{c.score}/{c.maxScore||50}</b>
              </div>
            ))}
          </div>

          {/* Recent applications */}
          <div className="panel">
            <div className="panel-head"><h3>Recent Applications</h3></div>
            {s.jobs.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6).map(j=>{
              const co = s.companies.find(c=>c.id===j.companyId);
              const st = s.stages.find(x=>x.id===j.status);
              return <div className="row clickable" key={j.id} onClick={()=>onOpenJob(j.id)}>
                <span className="r-name">{j.title} <span className="r-sub">· {co?.name||''}</span></span>
                <span className="pill" style={{background:st?.color+'22', color:st?.color}}>{st?.label||j.status}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
