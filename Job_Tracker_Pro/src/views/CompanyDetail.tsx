import React from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';

export default function CompanyDetail({ id, onBack }:{ id:string; onBack:()=>void }){
  const state = useStore();
  const co = state.companies.find(c=>c.id===id);
  if(!co) return <div className="empty"><div className="e-ico">🔍</div><strong>Company not found</strong></div>;

  const apps = state.jobs.filter(j=>j.companyId===id);
  const contacts = state.contacts.filter(c=>c.companyId===id);

  return (
    <div>
      <button className="btn sm ghost" onClick={onBack}>← Back</button>
      <div className="detail-head">
        <div>
          <h2>{co.name}</h2>
          <div className="muted text-sm">{co.industry||''} {co.hqLocation?`· ${co.hqLocation}`:''}</div>
        </div>
        <div className="flex" style={{gap:8}}>
          {co.rank&&<span className="rank-chip">#{co.rank}</span>}
          <b style={{color:'var(--accent)'}}>{co.score}/{co.maxScore||50}</b>
        </div>
      </div>

      <div className="detail-meta">
        {co.tier&&<span className="chip">tier {co.tier}</span>}
        {co.priorityDays&&<span className="chip">{co.priorityDays}</span>}
        <span className="chip">{co.followStatus.replace(/_/g,' ')}</span>
      </div>

      {co.angle&&(
        <div className="panel mb12">
          <div className="panel-head"><h3>Cold Email Angle</h3></div>
          <div className="text-sm" style={{lineHeight:1.7}}>{co.angle}</div>
        </div>
      )}

      <div className="grid grid-2" style={{alignItems:'start'}}>
        <div className="panel">
          <div className="panel-head"><h3>Applications ({apps.length})</h3></div>
          {apps.map(j=>{
            const st = state.stages.find(s=>s.id===j.status);
            return (
              <div className="row" key={j.id}>
                <span className="r-name">{j.title}</span>
                <span className="pill" style={{background:(st?.color||'#666')+'22', color:st?.color||'#666'}}>{st?.label||j.status}</span>
              </div>
            );
          })}
          {apps.length===0&&<div className="muted text-sm">No applications for this company</div>}
        </div>

        <div>
          <div className="panel">
            <div className="panel-head"><h3>Contacts ({contacts.length})</h3></div>
            {contacts.map(c=>(
              <div className="row" key={c.id}>
                <span className="r-name">{c.name}</span>
                <span className="r-sub">{c.title}</span>
                <span className="chip">{'★'.repeat(c.warmth||0)}</span>
              </div>
            ))}
            {contacts.length===0&&<div className="muted text-sm">No contacts yet — add from Contacts tab</div>}
          </div>

          {co.contactPrimary&&(
            <div className="panel mt12">
              <div className="panel-head"><h3>Key Contacts from Research</h3></div>
              <div className="text-sm">Primary: {co.contactPrimary}</div>
              {co.contactBackup&&<div className="text-sm muted mt8">Backup: {co.contactBackup}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
