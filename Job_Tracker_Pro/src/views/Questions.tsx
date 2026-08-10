import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { Question, StarStory } from '../types';

/* Provenance is encoded in the note text by the miner (scripts/mine-questions.mjs).
   "Sourced:" means a candidate write-up with a traceable thread id backs it.
   "Type-level" means the source report disclosed its live fetches failed, so the
   question is a representative type, not a verified question that company asked. */
type Grade = 'sourced'|'type-level'|'curated';
const gradeOf = (x: Question): Grade =>
  !x.notes ? 'curated'
    : /^Sourced:/.test(x.notes) ? 'sourced'
    : /Type-level/.test(x.notes) ? 'type-level'
    : 'curated';

const GRADE_LABEL: Record<Grade,string> = {
  sourced: '✓ sourced',
  'type-level': '~ type-level',
  curated: '✎ curated',
};

/* The mined bank is ~900 questions. Rendering every card on every keystroke
   locks the main thread, so the list is paged and the search box is debounced. */
const PAGE_SIZE = 60;

export default function Questions(){
  const state = useStore();
  const [tab, setTab] = useState<'questions'|'stories'>('questions');
  const [qRaw, setQRaw] = useState('');
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [grade, setGrade] = useState('');
  const [page, setPage] = useState(0);

  useEffect(()=>{
    const t = setTimeout(()=>setQ(qRaw), 180);
    return ()=>clearTimeout(t);
  },[qRaw]);

  const companies = useMemo(()=>{
    const m = new Map<string,number>();
    for(const x of state.questions) if(x.company) m.set(x.company,(m.get(x.company)||0)+1);
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  },[state.questions]);

  const questions = useMemo(()=>{
    let l = state.questions.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(x=>(x.text+' '+(x.company||'')+' '+(x.type||'')+' '+(x.notes||'')).toLowerCase().includes(t));
    if(company) l = l.filter(x=>x.company===company);
    if(type) l = l.filter(x=>x.type===type);
    if(grade) l = l.filter(x=>gradeOf(x)===grade);
    return l;
  },[state.questions, q, company, type, grade]);

  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(
    ()=>questions.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [questions, safePage],
  );

  /* Any filter change puts you back on page 1 — otherwise you land on an
     empty page 8 of a 2-page result and think the filter broke. */
  useEffect(()=>{ setPage(0); },[q, company, type, grade, tab]);

  const stories = useMemo(()=>{
    let l = state.starStories.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(x=>(x.title+' '+x.situation).toLowerCase().includes(t));
    return l;
  },[state.starStories, q]);

  return (
    <div>
      <div className="toolbar">
        <div className="flex" style={{gap:4}}>
          {(['questions','stories'] as const).map(v=>(
            <button key={v} className={"btn sm"+(tab===v?' primary':'')} onClick={()=>setTab(v)}>{v==='questions'?'Question Bank':'STAR Stories'}</button>
          ))}
        </div>
        <input className="search" placeholder="Search…" value={qRaw} onChange={e=>setQRaw(e.target.value)} />
        {tab==='questions' && <>
          <select className="btn sm" value={company} onChange={e=>setCompany(e.target.value)}>
            <option value="">All companies ({state.questions.length})</option>
            {companies.map(([c,n])=><option key={c} value={c}>{c} ({n})</option>)}
          </select>
          <select className="btn sm" value={type} onChange={e=>setType(e.target.value)}>
            <option value="">All types</option>
            {['behavioral','technical','system_design','coding','case','culture'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select className="btn sm" value={grade} onChange={e=>setGrade(e.target.value)}>
            <option value="">All provenance</option>
            <option value="sourced">✓ sourced only</option>
            <option value="type-level">~ type-level only</option>
            <option value="curated">✎ curated only</option>
          </select>
          <span className="muted text-sm" data-testid="q-count">
            {questions.length === 0
              ? '0 shown'
              : `${safePage*PAGE_SIZE+1}–${Math.min((safePage+1)*PAGE_SIZE, questions.length)} of ${questions.length}`}
          </span>
        </>}
        <button className="btn" onClick={()=>{
          const modal=useModal();
          modal.open(tab==='questions'?<QuestionForm onDone={()=>{modal.close();toast('Question added');}}/>
            :<StoryForm onDone={()=>{modal.close();toast('Story saved');}}/>);
        }}>{tab==='questions'?'＋ Question':'＋ Story'}</button>
      </div>

      {tab==='questions' && (
        <div className="grid grid-3" data-testid="q-grid">
          {pageItems.map(x=>(
            <div key={x.id} className="panel" data-testid="q-card">
              <div className="flex" style={{gap:6,flexWrap:'wrap',marginBottom:8}}>
                <span className="chip">{x.type}</span>
                {x.company&&<span className="chip">{x.company}</span>}
                {x.competency&&<span className="chip">{x.competency}</span>}
                <span className="chip" title={gradeOf(x)==='sourced'
                  ? 'Traceable to a candidate write-up'
                  : gradeOf(x)==='type-level'
                    ? 'Representative question type — the source report could not verify it live'
                    : 'Hand-written for this tracker'}
                  style={{marginLeft:'auto', color: gradeOf(x)==='sourced' ? 'var(--good)' : undefined}}>
                  {GRADE_LABEL[gradeOf(x)]}
                </span>
              </div>
              <div className="text-sm" style={{lineHeight:1.55}}>{x.text}</div>
              {x.notes&&<details className="muted text-sm mt8" style={{borderTop:'1px solid var(--border)',paddingTop:8}}>
                <summary style={{cursor:'pointer'}}>Coach note & source</summary>
                <div className="mt8" style={{lineHeight:1.5}}>{x.notes}</div>
              </details>}
              {x.myAnswer&&<div className="muted text-sm mt8" style={{borderTop:'1px solid var(--border)',paddingTop:8}}><b>My answer:</b> {x.myAnswer.slice(0,150)}…</div>}
            </div>
          ))}
          {questions.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">❓</div><strong>No questions match</strong><p>Clear a filter, or add your own question to the bank.</p></div>}
        </div>
      )}

      {tab==='questions' && pageCount>1 && (
        <div className="flex mt8" style={{gap:8, alignItems:'center', justifyContent:'center', padding:'12px 0'}} data-testid="q-pager">
          <button className="btn sm" disabled={safePage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>‹ Prev</button>
          <span className="muted text-sm">Page {safePage+1} / {pageCount}</span>
          <button className="btn sm" data-testid="q-next" disabled={safePage>=pageCount-1} onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))}>Next ›</button>
        </div>
      )}

      {tab==='stories' && (
        <div className="grid grid-3">
          {stories.map(s=>(
            <div key={s.id} className="panel">
              <b>{s.title}</b>
              <div className="flex mt8" style={{gap:5,flexWrap:'wrap'}}>
                {s.competencies.map(c=><span key={c} className="chip">{c}</span>)}
                {s.metrics?.map(m=><span key={m} className="chip" style={{color:'var(--good)'}}>{m}</span>)}
              </div>
              <div className="muted text-sm mt8"><b>S:</b> {s.situation.slice(0,100)}…</div>
              <div className="muted text-sm mt8"><b>R:</b> {s.result.slice(0,100)}…</div>
            </div>
          ))}
          {stories.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">🌟</div><strong>No STAR stories yet</strong><p>Document your strongest stories with Situation / Task / Action / Result.</p></div>}
        </div>
      )}
    </div>
  );
}

function QuestionForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [text,setText]=useState(''); const [type,setType]=useState('behavioral');
  const [company,setCompany]=useState(''); const [answer,setAnswer]=useState('');

  const submit=()=>{
    if(!text.trim()){ toast('Question required'); return; }
    state.addQuestion({
      text:text.trim(), type:type as Question['type'],
      company:company||undefined, myAnswer:answer||undefined,
    });
    onDone();
  };

  return <div><h3>Add Question</h3><div className="form">
    <label>Question<textarea rows={3} autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="e.g. Tell me about a time you influenced a decision with data" /></label>
    <div className="flex" style={{gap:8}}>
      <label style={{flex:1}}>Type<select value={type} onChange={e=>setType(e.target.value)}>
        {['behavioral','technical','system_design','coding','case','culture'].map(t=><option key={t}>{t}</option>)}
      </select></label>
      <label style={{flex:1}}>Company<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="(optional)" /></label>
    </div>
    <label>My answer<textarea rows={4} value={answer} onChange={e=>setAnswer(e.target.value)} /></label>
    <div className="modal-actions"><button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button><button className="btn primary" onClick={submit}>Save</button></div>
  </div></div>;
}

function StoryForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [title,setTitle]=useState(''); const [situation,setSituation]=useState('');
  const [task,setTask]=useState(''); const [action,setAction]=useState(''); const [result,setResult]=useState('');

  const submit=()=>{
    if(!title.trim()){ toast('Title required'); return; }
    state.addStory({
      title:title.trim(), situation, task, action, result,
      competencies:['execution'],
    });
    onDone();
  };

  return <div><h3>New STAR Story</h3><div className="form">
    <label>Title<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Fixed the funnel drop-off that recovered 12% conversion" /></label>
    <label>Situation<textarea rows={2} value={situation} onChange={e=>setSituation(e.target.value)} /></label>
    <label>Task<textarea rows={2} value={task} onChange={e=>setTask(e.target.value)} /></label>
    <label>Action<textarea rows={3} value={action} onChange={e=>setAction(e.target.value)} /></label>
    <label>Result<textarea rows={2} value={result} onChange={e=>setResult(e.target.value)} placeholder="Quantify it — % lift, $, time saved" /></label>
    <div className="modal-actions"><button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button><button className="btn primary" onClick={submit}>Save</button></div>
  </div></div>;
}
