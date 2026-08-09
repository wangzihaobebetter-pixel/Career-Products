import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { Contact } from '../types';

export default function Contacts(){
  const state = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const list = useMemo(()=>{
    let l = state.contacts.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(c=>(c.name+' '+(c.title||'')).toLowerCase().includes(t));
    if(status) l = l.filter(c=>c.status===status);
    return l.sort((a,b)=>(b.warmth||0)-(a.warmth||0));
  },[state.contacts, q, status]);

  const add = ()=>{
    const modal = useModal();
    modal.open(<ContactForm onDone={()=>{modal.close(); toast('Contact added');}} />);
  };

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search contacts…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="filter" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['not_contacted','reached_out','engaged','intro_done','advocate','not_interested','unresponsive'].map(s=><option key={s}>{s}</option>)}
        </select>
        <button className="btn" onClick={add}>＋ Add Contact</button>
        <span className="muted text-sm">{list.length} contacts</span>
      </div>

      <div className="grid grid-4">
        {list.map(c=>{
          const co = state.companies.find(x=>x.id===c.companyId);
          return (
            <div key={c.id} className="panel" style={{padding:'13px'}}>
              <div className="flex" style={{gap:9,alignItems:'center'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'var(--panel3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'var(--accent)'}}>
                  {c.name.slice(0,1).toUpperCase()}
                </div>
                <div style={{minWidth:0}}>
                  <div className="overflow-ellipsis" style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                  <div className="muted2 text-sm overflow-ellipsis">{c.title||''}</div>
                </div>
              </div>
              {co&&<div className="muted text-sm mt8">{co.name}</div>}
              <div className="flex mt8" style={{gap:5,flexWrap:'wrap'}}>
                <span className="chip">{'★'.repeat(c.warmth||0)}{'☆'.repeat(Math.max(0,5-(c.warmth||0)))}</span>
                <span className="chip">{c.relationship.replace(/_/g,' ')}</span>
                <span className="chip">{c.status.replace(/_/g,' ')}</span>
              </div>
              {c.nextFollowUpAt&&<div className="muted2 text-sm mt8">📅 follow-up {c.nextFollowUpAt.slice(0,10)}</div>}
            </div>
          );
        })}
        {list.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">👥</div><strong>No contacts yet</strong><p>Track recruiters, hiring managers, and referral connections.</p></div>}
      </div>
    </div>
  );
}

function ContactForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [name,setName]=useState(''); const [title,setTitle]=useState('');
  const [companyId,setCompanyId]=useState(state.companies[0]?.id||'');
  const [email,setEmail]=useState(''); const [linkedin,setLinkedin]=useState('');
  const [warmth,setWarmth]=useState('3'); const [relationship,setRelationship]=useState('recruiter');

  const submit=()=>{
    if(!name.trim()){ toast('Name required'); return; }
    state.addContact({
      name:name.trim(), title:title||undefined,
      companyId: companyId||undefined, email:email||undefined, linkedinUrl:linkedin||undefined,
      warmth:Number(warmth), relationship:relationship as Contact['relationship'], status:'not_contacted',
    });
    onDone();
  };

  return <div>
    <h3>Add Contact</h3>
    <div className="form">
      <label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} /></label>
      <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label>Company<select value={companyId} onChange={e=>setCompanyId(e.target.value)}>
        <option value="">(none)</option>
        {state.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
      <div className="flex" style={{gap:8}}>
        <label style={{flex:1}}>Warmth<select value={warmth} onChange={e=>setWarmth(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
        <label style={{flex:1}}>Relationship<select value={relationship} onChange={e=>setRelationship(e.target.value)}>
          {['recruiter','hiring_manager','teammate','referrer','alum','friend','event_met','cold'].map(s=><option key={s}>{s}</option>)}
        </select></label>
      </div>
      <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>LinkedIn<input value={linkedin} onChange={e=>setLinkedin(e.target.value)} /></label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add</button>
      </div>
    </div>
  </div>;
}
