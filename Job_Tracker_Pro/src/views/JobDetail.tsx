import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { matchBullets } from '../lib/match';

export default function JobDetail({ id, onBack }:{ id:string; onBack:()=>void }){
  const state = useStore();
  const job = state.jobs.find(j=>j.id===id);
  const [tab, setTab] = useState('overview');
  const [jdDraft, setJdDraft] = useState<string|null>(null);
  const [taskDraft, setTaskDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

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

  /* JD ↔ bullet-library match. Recomputed only when the JD or the bullet
     library actually changes — the extraction pass is not free. */
  const report = useMemo(
    ()=> matchBullets(job?.description||'', state.bullets.map(b=>({id:b.id, text:b.text}))),
    [job?.description, state.bullets]
  );

  if(!job) return <div className="empty"><div className="e-ico">🔍</div><strong>Job not found</strong></div>;

  const move = (to:string)=>{
    state.moveJob(id, to);
    toast(`Moved to ${state.stages.find(s=>s.id===to)?.label||to}`);
  };

  const TABS = ['overview','match','pipeline','interviews','tasks','contacts','notes','salary','activity'];

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

      {/* ===== JD match ===== */}
      {tab==='match' && (
        <div>
          {(!job.description || jdDraft!==null) ? (
            <div className="panel">
              <div className="panel-head"><h3>Paste the job description</h3></div>
              <p className="muted text-sm" style={{marginTop:0}}>
                Everything below is computed in your browser from this text and your own bullet library.
                Nothing is sent anywhere.
              </p>
              <textarea
                rows={12}
                style={{width:'100%'}}
                placeholder="Paste the full JD here — requirements section included, that's the part that carries the most weight."
                value={jdDraft ?? job.description ?? ''}
                onChange={e=>setJdDraft(e.target.value)}
              />
              <div className="flex" style={{gap:8,marginTop:8}}>
                <button className="btn primary" onClick={()=>{
                  state.updateJob(id,{description: jdDraft ?? ''});
                  setJdDraft(null);
                  toast('JD saved — match recomputed');
                }}>Save & analyze</button>
                {job.description && <button className="btn" onClick={()=>setJdDraft(null)}>Cancel</button>}
              </div>
            </div>
          ) : (
            <>
              <div className="kpi-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}>
                <div className="kpi">
                  <div className="k-num" style={{color: report.coverage>=60?'var(--good)':report.coverage>=35?'var(--warn)':'var(--bad)'}}>
                    {report.coverage}%
                  </div>
                  <div className="k-lbl">Skill coverage</div>
                </div>
                <div className="kpi"><div className="k-num">{report.keywords.length}</div><div className="k-lbl">Keywords found</div></div>
                <div className="kpi"><div className="k-num">{report.bullets.length}</div><div className="k-lbl">Bullets that hit</div></div>
                <div className="kpi"><div className="k-num" style={{color: report.missing.length?'var(--bad)':'var(--good)'}}>{report.missing.length}</div><div className="k-lbl">Uncovered skills</div></div>
              </div>

              <div className="flex" style={{gap:8,margin:'10px 0 14px'}}>
                <button className="btn sm" onClick={()=>setJdDraft(job.description||'')}>Edit JD</button>
                <button className="btn sm" onClick={()=>{
                  const top = report.bullets.slice(0,8).map(b=>'• '+b.text).join('\n');
                  navigator.clipboard?.writeText(top);
                  toast(`Copied top ${Math.min(8,report.bullets.length)} bullets`);
                }}>Copy top bullets</button>
                <button className="btn sm" onClick={()=>{
                  state.updateJob(id,{ jdKeywords: report.keywords.filter(k=>k.isSkill).map(k=>k.term) });
                  toast('Keywords saved to this job');
                }}>Save keywords</button>
              </div>

              <div className="grid grid-2" style={{alignItems:'start'}}>
                <div className="panel">
                  <div className="panel-head">
                    <h3>Your bullets, ranked for this JD</h3>
                    <span className="muted2 text-sm">{report.bullets.length}</span>
                  </div>
                  {report.bullets.length===0 && (
                    <div className="empty" style={{padding:18}}>
                      <div className="e-ico">📄</div><strong>No bullet overlaps</strong>
                      <p>Nothing in your library shares vocabulary with this JD. That is a real signal, not a bug.</p>
                    </div>
                  )}
                  {report.bullets.slice(0,15).map((b,i)=>(
                    <div key={b.bulletId} style={{background:'var(--panel2)',borderRadius:8,padding:10,marginBottom:8}}>
                      <div className="flex" style={{justifyContent:'space-between',gap:8}}>
                        <span className="muted2 text-sm">#{i+1}</span>
                        <span className="chip">score {b.score}</span>
                      </div>
                      <div style={{fontSize:13,margin:'4px 0 6px'}}>{b.text}</div>
                      <div className="flex" style={{gap:4,flexWrap:'wrap'}}>
                        {b.hits.slice(0,10).map(h=><span key={h} className="chip" style={{fontSize:11}}>{h}</span>)}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="panel">
                    <div className="panel-head"><h3>Gaps — skills the JD wants that you don't show</h3></div>
                    {report.missing.length===0
                      ? <div className="muted text-sm">No uncovered skill keywords. Rare — double-check the JD pasted in full.</div>
                      : <div className="flex" style={{gap:5,flexWrap:'wrap'}}>
                          {report.missing.map(k=>(
                            <span key={k.term} className="chip" style={{borderColor:'var(--bad)',color:'var(--bad)'}}>
                              {k.term}{k.weight===3?' ★':''}
                            </span>
                          ))}
                        </div>}
                    <p className="muted text-sm" style={{marginBottom:0}}>
                      ★ = the term appears in the requirements block, which is where a screener filters.
                      A gap is only worth closing if you can back it with something you actually did.
                    </p>
                  </div>

                  <div className="panel mt12">
                    <div className="panel-head"><h3>Covered</h3><span className="muted2 text-sm">{report.matched.length}</span></div>
                    <div className="flex" style={{gap:5,flexWrap:'wrap'}}>
                      {report.matched.slice(0,40).map(k=>(
                        <span key={k.term} className="chip" style={{borderColor:'var(--good)',color:'var(--good)'}}>{k.term}</span>
                      ))}
                      {report.matched.length===0 && <span className="muted text-sm">Nothing covered yet.</span>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
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
          <div className="panel-head"><h3>Interviews ({interviews.length})</h3></div>
          <QuickSchedule jobId={id} />
          {interviews.length===0&&<div className="empty" style={{padding:18}}><div className="e-ico">🎤</div><strong>No interviews</strong></div>}
          {interviews.map(iv=>(
            <div className="row" key={iv.id}>
              <span className="r-name">{iv.type.replace(/_/g,' ')}</span>
              <span className="r-sub">{iv.scheduledAt.slice(0,16).replace('T',' ')}</span>
              {iv.interviewerName&&<span className="r-sub">with {iv.interviewerName}</span>}
              <select value={iv.outcome} onChange={e=>state.logInterviewOutcome(iv.id, e.target.value as never)}>
                {['pending','passed','failed','no_show','rescheduled','canceled'].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ===== Tasks ===== */}
      {tab==='tasks' && (
        <div className="panel">
          <div className="panel-head"><h3>Tasks ({tasks.length})</h3></div>
          <div className="flex" style={{gap:6,marginBottom:10}}>
            <input
              style={{flex:1}}
              placeholder="New task for this role — e.g. follow up with the recruiter"
              value={taskDraft}
              onChange={e=>setTaskDraft(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Enter' && taskDraft.trim()){
                  state.addTask({ title: taskDraft.trim(), jobId: id, type: 'follow_up' });
                  setTaskDraft(''); toast('Task added');
                }
              }}
            />
            <button className="btn" disabled={!taskDraft.trim()} onClick={()=>{
              state.addTask({ title: taskDraft.trim(), jobId: id, type: 'follow_up' });
              setTaskDraft(''); toast('Task added');
            }}>+ Add</button>
          </div>
          {tasks.length===0&&<div className="empty" style={{padding:18}}><div className="e-ico">✅</div><strong>No tasks</strong><p>Add follow-ups, thank-you notes, assessments.</p></div>}
          {tasks.map(t=>(
            <div className="row" key={t.id}>
              <input type="checkbox" checked={t.status==='done'} onChange={()=>state.toggleTask(t.id)} style={{width:15,height:15}}/>
              <span className="r-name" style={{textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</span>
              {t.dueDate&&<span className="r-date">{t.dueDate.slice(5,10)}</span>}
              <button className="btn sm ghost" onClick={()=>state.removeTask(t.id)}>×</button>
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
          <div className="panel-head"><h3>Notes ({notes.length})</h3></div>
          <div style={{marginBottom:10}}>
            <textarea
              rows={3}
              style={{width:'100%'}}
              placeholder="Call takeaway, what they emphasised, what to do next…"
              value={noteDraft}
              onChange={e=>setNoteDraft(e.target.value)}
            />
            <button className="btn" style={{marginTop:6}} disabled={!noteDraft.trim()} onClick={()=>{
              state.addNote({ parentType:'job', parentId:id, body:noteDraft.trim() });
              setNoteDraft(''); toast('Note saved');
            }}>Save note</button>
          </div>
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

/* Inline round scheduler. Booking a round here goes through the same
   store action as the Interviews view, so the pipeline auto-advance in
   store.addInterview applies identically. */
function QuickSchedule({ jobId }:{ jobId:string }){
  const state = useStore();
  const [type,setType] = useState('recruiter_call');
  const [at,setAt] = useState('');
  const [who,setWho] = useState('');
  return (
    <div className="flex" style={{gap:6,flexWrap:'wrap',marginBottom:10}}>
      <select value={type} onChange={e=>setType(e.target.value)}>
        {['recruiter_call','hiring_manager','technical_phone','take_home_review','system_design','coding','behavioral','onsite','panel','final','informal_chat'].map(t=>
          <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
      </select>
      <input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)} />
      <input placeholder="Interviewer (optional)" value={who} onChange={e=>setWho(e.target.value)} style={{minWidth:170}} />
      <button className="btn primary" disabled={!at} onClick={()=>{
        state.addInterview({ jobId, type: type as never, scheduledAt: new Date(at).toISOString(), interviewerName: who||undefined });
        setAt(''); setWho(''); toast('Round scheduled — pipeline updated');
      }}>Schedule</button>
    </div>
  );
}
