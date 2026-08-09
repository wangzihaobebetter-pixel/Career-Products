import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { Company } from '../types';

export default function Companies({ onOpen }:{ onOpen:(id:string)=>void }){
  const state = useStore();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');

  const list = useMemo(()=>{
    let l = state.companies.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(c=>(c.name+' '+(c.industry||'')+' '+(c.contactPrimary||'')).toLowerCase().includes(t));
    if(tier) l = l.filter(c=>c.tier===tier);
    return l.sort((a,b)=>(b.score||0)-(a.score||0)||(a.rank||99)-(b.rank||99));
  },[state.companies, q, tier]);

  const addCompany = ()=>{
    const modal = useModal();
    modal.open(<CompanyForm onDone={()=>{modal.close(); toast('Company added');}} />);
  };

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search companies…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="filter" value={tier} onChange={e=>setTier(e.target.value)}>
          <option value="">All tiers</option><option>T1</option><option>T2</option><option>T3</option>
        </select>
        <button className="btn" onClick={addCompany}>＋ Add Company</button>
        <span className="muted text-sm">{list.length} companies</span>
      </div>

      <div className="grid grid-3">
        {list.map(c=>{
          const apps = state.jobs.filter(j=>j.companyId===c.id).length;
          return (
            <div key={c.id} className="panel" style={{cursor:'pointer'}} onClick={()=>onOpen(c.id)}>
              <div className="flex-between">
                <div className="flex" style={{gap:8}}>
                  <span className="rank-chip">#{c.rank||'—'}</span>
                  <b>{c.name}</b>
                </div>
                <b style={{color:'var(--accent)'}}>{c.score}/{c.maxScore||50}</b>
              </div>
              <div className="muted text-sm mt8">{c.industry||''} {c.tier?`· ${c.tier}`:''}</div>
              <div className="flex mt8" style={{gap:6,flexWrap:'wrap'}}>
                <span className="chip">{apps} apps</span>
                {c.priorityDays&&<span className="chip">{c.priorityDays}</span>}
                {c.followStatus==='on_watchlist'&&<span className="chip">👀 watchlist</span>}
                {c.followStatus==='following'&&<span className="chip">following</span>}
              </div>
              {c.angle&&<div className="muted text-sm mt8" style={{opacity:.85}}>{c.angle.length>110? c.angle.slice(0,110)+'…':c.angle}</div>}
            </div>
          );
        })}
        {list.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><div className="e-ico">🏢</div><strong>No companies yet</strong><p>Add target companies from screening research.</p></div>}
      </div>
    </div>
  );
}

function CompanyForm({ onDone }:{ onDone:()=>void }){
  const state = useStore();
  const [name,setName]=useState(''); const [industry,setIndustry]=useState('');
  const [tier,setTier]=useState('T2'); const [score,setScore]=useState('');

  const submit=()=>{
    if(!name.trim()){ toast('Name required'); return; }
    state.addCompany({
      name:name.trim(), industry:industry||undefined, tier, score:score?Number(score):0,
      maxScore:50, rank:state.companies.length+1, followStatus:'on_watchlist',
    } as Partial<Company>);
    onDone();
  };

  return <div>
    <h3>Add Company</h3>
    <div className="form">
      <label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} /></label>
      <label>Industry<input value={industry} onChange={e=>setIndustry(e.target.value)} /></label>
      <div className="flex" style={{gap:8}}>
        <label style={{flex:1}}>Tier<select value={tier} onChange={e=>setTier(e.target.value)}><option>T1</option><option>T2</option><option>T3</option></select></label>
        <label style={{flex:1}}>Score (0-50)<input value={score} onChange={e=>setScore(e.target.value)} placeholder="e.g. 45" /></label>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={()=>useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add</button>
      </div>
    </div>
  </div>;
}
