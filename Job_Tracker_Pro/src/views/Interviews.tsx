import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { InterviewEvent } from '../types';

export default function Interviews(){
  const state = useStore();
  const [month, setMonth] = useState(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); });
  const [show, setShow] = useState<'calendar'|'list'>('calendar');

  const list = useMemo(()=>state.interviews.slice().sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)),[state.interviews]);
  const upcoming = list.filter(i=>new Date(i.scheduledAt)>=new Date());

  const add = ()=>{
    const modal = useModal();
    modal.open(<InterviewForm onDone={()=>{modal.close(); toast('Interview scheduled');}} />);
  };

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m-1, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number|null)[] = Array.from({length:startDay},()=>null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  const today = new Date();

  return (
    <div>
      <div className="toolbar">
        <div className="flex" style={{gap:4}}>
          {(['calendar','list'] as const).map(v=>(
            <button key={v} className={"btn sm"+(show===v?' primary':'')} onClick={()=>setShow(v)}>{v}</button>
          ))}
        </div>
        <button className="btn" onClick={add}>＋ Schedule Interview</button>
        <span className="muted text-sm">{upcoming.length} upcoming</span>
      </div>

      {show==='calendar' && (
        <div>
          <div className="flex-between mb12">
            <button className="btn sm" onClick={()=>{
              const d=new Date(y, m-2, 1); setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
            }}>← Prev</button>
            <b>{first.toLocaleString('en-US',{month:'long',year:'numeric'})}</b>
            <button className="btn sm" onClick={()=>{
              const d=new Date(y, m, 1); setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
            }}>Next →</button>
          </div>
          <div className="cal-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="muted2" style={{textAlign:'center',padding:'5px',fontSize:'11px',background:'var(--panel)'}}>{d}</div>)}
            {cells.map((day,i)=>{
              if(day===null) return <div key={'x'+i} className="cal-cell other"/>;
              const key = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const evs = list.filter(iv=>iv.scheduledAt.slice(0,10)===key);
              const isToday = key===today.toISOString().slice(0,10);
              return (
                <div key={day} className={"cal-cell"+(isToday?' today':'')}>
                  <span className="cal-num">{day}</span>
                  {evs.map(iv=>{
                    const job = state.jobs.find(j=>j.id===iv.jobId);
                    const co = state.companies.find(c=>c.id===job?.companyId);
                    return <div key={iv.id} className="cal-ev" title={iv.type+' @ '+co?.name}>{co?.name||iv.type}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {show==='list' && (
        <div className="panel">
          {list.length===0 && <div className="empty"><div className="e-ico">🎤</div><strong>No interviews</strong><p>Schedule recruiter calls, technical rounds, and onsites here.</p></div>}
          {list.map(iv=>{
            const job = state.jobs.find(j=>j.id===iv.jobId);
            const co = state.companies.find(c=>c.id===job?.companyId);
            return (
              <div className="row" key={iv.id}>
                <span style={{color:'var(--accent)'}}>📅</span>
                <span className="r-name">{iv.type.replace(/_/g,' ')} <span className="r-sub">· {co?.name||''} {job?`· ${job.title}`:''}</span></span>
                <span className="r-sub">{iv.interviewerName?`with ${iv.interviewerName}`:''}</span>
                <span className="r-date">{iv.scheduledAt.slice(0,16).replace('T',' ')}</span>
                <span className="chip">{iv.outcome}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InterviewForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [jobId,setJobId]=useState(state.jobs[0]?.id||'');
  const [type,setType]=useState('recruiter_call');
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [time,setTime]=useState('10:00');
  const [interviewer,setInterviewer]=useState('');

  const submit=()=>{
    if(!jobId){ toast('Select a job'); return; }
    state.addInterview({
      jobId, type: type as InterviewEvent['type'], scheduledAt: date+'T'+time+':00',
      interviewerName:interviewer||undefined, outcome:'pending',
    });
    onDone();
  };

  return <div>
    <h3>Schedule Interview</h3>
    <div className="form">
      <label>Job<select value={jobId} onChange={e=>setJobId(e.target.value)}>
        {state.jobs.map(j=>{const co=state.companies.find(c=>c.id===j.companyId); return <option key={j.id} value={j.id}>{co?.name||''} — {j.title}</option>;})}
      </select></label>
      <label>Type<select value={type} onChange={e=>setType(e.target.value)}>
        {['recruiter_call','hiring_manager','technical_phone','take_home_review','system_design','coding','behavioral','onsite','panel','final','reference_check','offer_call','informal_chat'].map(s=><option key={s}>{s}</option>)}
      </select></label>
      <div className="flex" style={{gap:8}}>
        <label style={{flex:1}}>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label style={{flex:1}}>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)} /></label>
      </div>
      <label>Interviewer<input value={interviewer} onChange={e=>setInterviewer(e.target.value)} placeholder="Name / title" /></label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Schedule</button>
      </div>
    </div>
  </div>;
}
