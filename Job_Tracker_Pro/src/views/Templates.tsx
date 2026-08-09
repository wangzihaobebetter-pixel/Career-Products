import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { EmailTemplate, TemplateCategory } from '../types';

const CATEGORIES: TemplateCategory[] = ['cold_outreach','referral_request','follow_up','thank_you','post_rejection','salary_negotiation','cover_letter','networking'];

export default function Templates(){
  const state = useStore();
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');

  const list = useMemo(()=>{
    let l = state.templates.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(x=>(x.name+' '+x.subject+' '+x.body).toLowerCase().includes(t));
    if(cat) l = l.filter(x=>x.category===cat);
    return l;
  },[state.templates, cat, q]);

  const add = ()=>{
    const modal = useModal();
    modal.open(<TemplateForm onDone={()=>{modal.close(); toast('Template saved');}} />);
  };

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search templates…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="filter" value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c=><option key={c}>{c.replace(/_/g,' ')}</option>)}
        </select>
        <button className="btn" onClick={add}>＋ New Template</button>
        <span className="muted text-sm">{list.length} templates</span>
      </div>

      <div className="grid grid-3">
        {list.map(t=>(
          <div key={t.id} className="panel">
            <div className="flex-between">
              <b>{t.name}</b>
              <span className="chip">{t.category.replace(/_/g,' ')}</span>
            </div>
            <div className="muted text-sm mt8"><b>Subject:</b> {t.subject}</div>
            <div className="muted text-sm mt8" style={{maxHeight:90,overflow:'hidden',lineHeight:1.5}}>{t.body.slice(0,220)}{t.body.length>220?'…':''}</div>
            <div className="flex mt8" style={{gap:6}}>
              <button className="btn sm" onClick={()=>{navigator.clipboard.writeText(t.subject+'\n\n'+t.body); toast('Copied template');}}>Copy</button>
              <button className="btn sm ghost" onClick={()=>{
                const modal=useModal();
                modal.open(<PreviewTemplate t={t} onClose={()=>modal.close()} />);
              }}>Preview</button>
            </div>
          </div>
        ))}
        {list.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">✉️</div><strong>No templates</strong><p>Build cold outreach, follow-up, and thank-you sequences.</p></div>}
      </div>
    </div>
  );
}

function PreviewTemplate({ t, onClose }:{ t:EmailTemplate; onClose:()=>void }){
  return <div>
    <h3>{t.name}</h3>
    <div className="muted text-sm mb12"><b>Subject:</b> {t.subject}</div>
    <div style={{background:'var(--panel2)',borderRadius:8,padding:14,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{t.body}</div>
    <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
  </div>;
}

function TemplateForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [name,setName]=useState(''); const [category,setCategory]=useState<TemplateCategory>('cold_outreach');
  const [subject,setSubject]=useState(''); const [body,setBody]=useState('');

  const submit=()=>{
    if(!name.trim()||!body.trim()){ toast('Name and body required'); return; }
    state.addTemplate({
      name:name.trim(), category, subject, body,
    });
    onDone();
  };

  return <div>
    <h3>New Email Template</h3>
    <div className="form">
      <label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Cold outreach — 3-day sequence #1" /></label>
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value as TemplateCategory)}>
        {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
      </select></label>
      <label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject line with {{company}} placeholders" /></label>
      <label>Body<textarea rows={8} value={body} onChange={e=>setBody(e.target.value)} placeholder={'Hi {{firstName}},\n\nI noticed {{company}} is…\n\n— Zihao'} /></label>
      <div className="muted2 text-sm">Use {'{{firstName}}'} {'{{company}}'} {'{{role}}'} merge fields</div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Save</button>
      </div>
    </div>
  </div>;
}
