import React, { useMemo, useState } from 'react';
import { companyIntel, visaMilestones, intelMeta, type CompanyIntel, type Evidence } from '../seed4';

/* Intel is reference data from the 2026-08-09 research passes. It is
   read-only on purpose: nothing in here is his to edit, and every claim
   carries an evidence grade so a reconstruction never reads as a fact. */

const EVIDENCE_LABEL: Record<Evidence, string> = {
  firsthand: 'First-hand write-up',
  partial: 'Fragments only',
  inferred: 'Reconstructed — not documented',
};

const EVIDENCE_COLOR: Record<Evidence, string> = {
  firsthand: 'var(--good)',
  partial: 'var(--warn)',
  inferred: 'var(--muted)',
};

export default function Intel(){
  const [tab, setTab] = useState<'companies'|'visa'>('companies');
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState<'all'|Evidence>('all');
  const [open, setOpen] = useState<string|null>(null);

  const list = useMemo(()=>{
    let l = companyIntel.slice();
    if(grade !== 'all') l = l.filter(c => c.evidence === grade);
    const t = q.toLowerCase().trim();
    if(t) l = l.filter(c =>
      (c.company + ' ' + c.sector + ' ' + c.hq + ' ' + c.focus.join(' ') + ' ' + c.traps.join(' '))
        .toLowerCase().includes(t));
    const order: Record<Evidence, number> = { firsthand: 0, partial: 1, inferred: 2 };
    return l.sort((a,b)=> order[a.evidence] - order[b.evidence] || a.company.localeCompare(b.company));
  },[q, grade]);

  return (
    <div>
      <div className="toolbar">
        <div className="flex" style={{gap:4}}>
          <button className={"btn sm"+(tab==='companies'?' primary':'')} onClick={()=>setTab('companies')}>Company Intel</button>
          <button className={"btn sm"+(tab==='visa'?' primary':'')} onClick={()=>setTab('visa')}>Work Authorisation</button>
        </div>
        {tab==='companies' && <>
          <input className="search" placeholder="Search company, sector, trap…" value={q} onChange={e=>setQ(e.target.value)} />
          <select value={grade} onChange={e=>setGrade(e.target.value as any)}>
            <option value="all">All evidence</option>
            <option value="firsthand">First-hand only</option>
            <option value="partial">Fragments</option>
            <option value="inferred">Reconstructed</option>
          </select>
        </>}
      </div>

      {tab==='companies' && (
        <>
          <div className="panel mb12">
            <div className="text-sm">
              <b>{intelMeta.companyCount} companies</b> from the live research pass on {intelMeta.generatedAt}.
              {' '}<b style={{color:'var(--good)'}}>{intelMeta.firsthandCount}</b> have a first-hand public write-up behind them;
              the rest are fragments or reconstructions. Every card says which it is — prep against a
              reconstruction, but never quote one back to an interviewer as fact.
            </div>
          </div>

          <div className="grid grid-2">
            {list.map(c => (
              <IntelCard key={c.company} c={c} open={open===c.company} onToggle={()=>setOpen(open===c.company?null:c.company)} />
            ))}
            {list.length===0 && (
              <div className="empty" style={{gridColumn:'1/-1'}}>
                <div className="e-ico">🔎</div><strong>Nothing matches</strong>
                <p>Try a different search or widen the evidence filter.</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab==='visa' && <VisaTimeline />}
    </div>
  );
}

function IntelCard({ c, open, onToggle }:{ c: CompanyIntel; open: boolean; onToggle: ()=>void }){
  return (
    <div className="panel">
      <div className="flex" style={{justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <div>
          <b style={{fontSize:15}}>{c.company}</b>
          <div className="muted text-sm">{c.hq} · {c.sector}</div>
        </div>
        <span className="chip" style={{color:EVIDENCE_COLOR[c.evidence],whiteSpace:'nowrap'}}>
          {EVIDENCE_LABEL[c.evidence]}
        </span>
      </div>

      <div className="flex mt8" style={{gap:5,flexWrap:'wrap'}}>
        {typeof c.rounds === 'number' && <span className="chip">{c.rounds} rounds</span>}
        {c.timeline && <span className="chip">{c.timeline.length > 40 ? 'timeline documented' : c.timeline}</span>}
        {c.focus.slice(0,3).map(f => <span key={f} className="chip">{f}</span>)}
      </div>

      {c.comp && <div className="muted text-sm mt8"><b>Comp:</b> {c.comp}</div>}

      {c.caution && (
        <div className="text-sm mt8" style={{color:'var(--warn)',borderLeft:'3px solid var(--warn)',paddingLeft:8}}>
          {c.caution}
        </div>
      )}

      <button className="btn sm mt8" onClick={onToggle}>{open ? 'Hide loop' : 'Show loop, traps & sources'}</button>

      {open && (
        <div className="mt8" style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
          <div className="text-sm"><b>The loop</b></div>
          <ol className="text-sm" style={{paddingLeft:18,marginTop:6,lineHeight:1.6}}>
            {c.loop.map((r,i)=>(
              <li key={i} style={{marginBottom:6}}>
                <b>{r.name}</b>{r.length ? <span className="muted"> · {r.length}</span> : null}
                <div className="muted">{r.detail}</div>
              </li>
            ))}
          </ol>

          <div className="text-sm mt8"><b>What they test</b></div>
          <div className="flex mt8" style={{gap:5,flexWrap:'wrap'}}>
            {c.focus.map(f => <span key={f} className="chip">{f}</span>)}
          </div>

          <div className="text-sm mt8"><b>How candidates lose it</b></div>
          <ul className="text-sm muted" style={{paddingLeft:18,marginTop:6,lineHeight:1.6}}>
            {c.traps.map((t,i)=><li key={i} style={{marginBottom:4}}>{t}</li>)}
          </ul>

          {c.timeline && <div className="muted text-sm mt8"><b>Timeline:</b> {c.timeline}</div>}

          <div className="text-sm mt8"><b>Sources</b></div>
          <ul className="text-sm" style={{paddingLeft:18,marginTop:6,lineHeight:1.6,wordBreak:'break-all'}}>
            {c.sources.map(s => (
              <li key={s}><a href={s} target="_blank" rel="noreferrer">{s}</a></li>
            ))}
          </ul>

          <div className="mt8">
            <a className="btn sm" href={c.careersUrl} target="_blank" rel="noreferrer">Open careers page</a>
          </div>
        </div>
      )}
    </div>
  );
}

function VisaTimeline(){
  const sev: Record<string,string> = { info:'var(--muted)', act:'var(--accent)', risk:'var(--warn)' };
  const label: Record<string,string> = { info:'context', act:'action needed', risk:'risk' };

  return (
    <div>
      <div className="panel mb12">
        <div className="text-sm">
          F-1 → OPT → STEM OPT → H-1B, with every claim traced to a government source and dated
          2026-08-09. <b>This is not legal advice.</b> The two moving pieces right now — the fixed
          admission-period rule and the $100,000 H-1B payment — are changing fast, so confirm anything
          decision-shaped with the Northeastern ISSO and a licensed immigration attorney before acting on it.
        </div>
      </div>

      <div className="grid grid-2">
        {visaMilestones.map((m,i)=>(
          <div key={i} className="panel" style={{borderLeft:`3px solid ${sev[m.severity]}`}}>
            <div className="flex" style={{justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
              <b>{m.title}</b>
              <span className="chip" style={{color:sev[m.severity],whiteSpace:'nowrap'}}>{label[m.severity]}</span>
            </div>
            <div className="muted text-sm mt8">{m.window}</div>
            <div className="text-sm mt8" style={{lineHeight:1.6}}>{m.what}</div>
            {m.action && (
              <div className="text-sm mt8" style={{borderLeft:'3px solid var(--accent)',paddingLeft:8}}>
                <b>Do this:</b> {m.action}
              </div>
            )}
            {m.source && (
              <div className="text-sm mt8" style={{wordBreak:'break-all'}}>
                <a href={m.source} target="_blank" rel="noreferrer">{m.source}</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
