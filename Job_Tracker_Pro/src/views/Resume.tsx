import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';

export default function Resume(){
  const state = useStore();
  const [q, setQ] = useState('');
  const [comp, setComp] = useState('');

  const bullets = useMemo(()=>{
    let l = state.bullets.slice();
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(b=>b.text.toLowerCase().includes(t));
    if(comp) l = l.filter(b=>b.competency===comp);
    return l;
  },[state.bullets, q, comp]);

  const copyAll = ()=>{
    const txt = bullets.map((b,i)=>`${i+1}. ${b.text}`).join('\n');
    navigator.clipboard.writeText(txt);
    toast(`Copied ${bullets.length} bullets`);
  };

  return (
    <div className="grid grid-2" style={{alignItems:'start'}}>
      <div>
        <div className="panel">
          <div className="panel-head"><h3>Resume Versions</h3><button className="btn sm" onClick={()=>toast('Upload in full build')}>＋ Add</button></div>
          {state.resumes.length===0 && <div className="empty" style={{padding:'20px'}}><div className="e-ico">📄</div><strong>No resume versions</strong><p>Track base and tailored versions per target role.</p></div>}
          {state.resumes.map(r=>(
            <div className="row" key={r.id}>
              <span className="r-name">{r.label}</span>
              <span className="chip">{r.type}</span>
              {r.matchScore!=null&&<span className="chip">match {r.matchScore}%</span>}
              <span className="r-date">{r.useCount} uses</span>
            </div>
          ))}
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Cover Letters</h3><button className="btn sm">＋</button></div>
          <div className="muted text-sm">Templates library covers cold outreach, follow-up, thank-you, negotiation — see Email Templates.</div>
        </div>
      </div>

      <div>
        <div className="panel">
          <div className="panel-head">
            <h3>Bullet Library ({bullets.length})</h3>
            <div className="flex" style={{gap:5}}>
              <button className="btn sm" onClick={copyAll}>Copy all</button>
            </div>
          </div>
          <div className="toolbar" style={{marginBottom:10}}>
            <input className="search" placeholder="Search bullets…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="filter" value={comp} onChange={e=>setComp(e.target.value)}>
              <option value="">All competencies</option>
              {['leadership','technical','execution','strategy','communication','design','data','customer','financial','other'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'70vh',overflowY:'auto'}}>
            {bullets.map((b,i)=>(
              <div key={b.id} style={{display:'flex',gap:9,background:'var(--panel2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 11px',fontSize:'12.5px',alignItems:'flex-start'}}>
                <span style={{color:'var(--accent)',fontWeight:700,minWidth:18}}>{i+1}</span>
                <span style={{flex:1}}>{b.text}</span>
                <span className="chip">{b.competency}</span>
                <button className="copy sm" style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'2px 7px',borderRadius:5,fontSize:11,cursor:'pointer'}}
                  onClick={()=>{navigator.clipboard.writeText(b.text); toast('Copied');}}>⧉</button>
              </div>
            ))}
            {bullets.length===0 && <div className="empty"><div className="e-ico">💡</div><strong>No bullets</strong><p>Import from screening research or add your own.</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
