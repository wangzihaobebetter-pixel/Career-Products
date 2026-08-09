import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { Question, StarStory } from '../types';

export default function Questions(){
  const state = useStore();
  const [tab, setTab] = useState<'questions'|'stories'>('questions');
  const [q, setQ] = useState('');

  const questions = useMemo(()=>{
    let l = state.questions.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(x=>(x.text+' '+(x.company||'')+' '+(x.type||'')).toLowerCase().includes(t));
    return l;
  },[state.questions, q]);

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
        <input className="search" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={()=>{
          const modal=useModal();
          modal.open(tab==='questions'?<QuestionForm onDone={()=>{modal.close();toast('Question added');}}/>
            :<StoryForm onDone={()=>{modal.close();toast('Story saved');}}/>);
        }}>{tab==='questions'?'＋ Question':'＋ Story'}</button>
      </div>

      {tab==='questions' && (
        <div className="grid grid-3">
          {questions.map(x=>(
            <div key={x.id} className="panel">
              <div className="flex" style={{gap:6,flexWrap:'wrap',marginBottom:8}}>
                <span className="chip">{x.type}</span>
                {x.company&&<span className="chip">{x.company}</span>}
                {x.competency&&<span className="chip">{x.competency}</span>}
              </div>
              <div className="text-sm" style={{lineHeight:1.55}}>{x.text}</div>
              {x.myAnswer&&<div className="muted text-sm mt8" style={{borderTop:'1px solid var(--border)',paddingTop:8}}><b>My answer:</b> {x.myAnswer.slice(0,150)}…</div>}
            </div>
          ))}
          {questions.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">❓</div><strong>No questions yet</strong><p>Build your interview question bank by company.</p></div>}
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
