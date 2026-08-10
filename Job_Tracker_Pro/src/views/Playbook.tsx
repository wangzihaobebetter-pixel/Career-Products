import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import {
  phases, weeklyTargets, targetsRationale, failureModes, weeklyCheck,
  allCheckIds, PLAN_START, PLAN_END,
} from '../data/playbook90';

const DAY = 864e5;

function dayIndex(){
  const start = new Date(PLAN_START + 'T00:00:00').getTime();
  return Math.floor((Date.now() - start) / DAY) + 1;
}

/** Which phase today falls in — 0 if the plan has not started or has ended. */
function currentPhase(day: number){
  if (day < 1) return 0;
  if (day <= 30) return 1;
  if (day <= 60) return 2;
  if (day <= 90) return 3;
  return 0;
}

export default function Playbook(){
  const state = useStore();
  const [tab, setTab] = useState<'plan'|'targets'|'risks'|'check'>('plan');
  const checks = state.planChecks || {};
  const day = dayIndex();
  const phaseNow = currentPhase(day);

  const done = useMemo(()=>allCheckIds.filter(id=>checks[id]).length, [checks]);
  const pct = Math.round(done / allCheckIds.length * 100);

  const toggle = (id: string) => state.togglePlanCheck(id);

  return (
    <div>
      <div className="toolbar">
        <div className="flex" style={{gap:4}}>
          {([['plan','Phases'],['targets','Weekly Targets'],['risks','Failure Modes'],['check','Weekly Self-Check']] as const).map(([v,l])=>(
            <button key={v} className={"btn sm"+(tab===v?' primary':'')} onClick={()=>setTab(v as never)}>{l}</button>
          ))}
        </div>
        <div className="flex" style={{gap:8,marginLeft:'auto',alignItems:'center'}}>
          <span className="muted text-sm">{done}/{allCheckIds.length} ticked · {pct}%</span>
          <button className="btn sm" onClick={()=>{ state.resetPlanChecks(); toast('Playbook progress cleared'); }}>Reset</button>
        </div>
      </div>

      <div className="panel mb12">
        <div className="flex" style={{gap:16,flexWrap:'wrap',alignItems:'baseline'}}>
          <div><b>Day {day < 1 ? '—' : day}</b> <span className="muted text-sm">of 90</span></div>
          <div className="muted text-sm">{PLAN_START} → {PLAN_END}</div>
          {phaseNow > 0
            ? <span className="chip">Now in Phase {phaseNow} — {phases[phaseNow-1].name}</span>
            : <span className="chip">Outside the 90-day window</span>}
        </div>
        <div className="muted text-sm mt8" style={{lineHeight:1.55}}>
          The window closes Nov 7 rather than at graduation, so an offer lands before the
          OPT start window instead of after it.
        </div>
        <div style={{height:6,background:'var(--border)',borderRadius:99,marginTop:12,overflow:'hidden'}}>
          <div style={{height:'100%',width:pct+'%',background:'var(--accent)',transition:'width .2s'}} />
        </div>
      </div>

      {tab==='plan' && phases.map(p=>{
        const ids = p.weeks.flatMap(w=>w.items.map(i=>i.id));
        const d = ids.filter(id=>checks[id]).length;
        return (
          <div key={p.id} className="panel mb12">
            <div className="flex" style={{gap:10,flexWrap:'wrap',alignItems:'baseline'}}>
              <h3 style={{margin:0}}>Phase {p.n} — {p.name}</h3>
              <span className="chip">{p.dates}</span>
              <span className="chip">{p.days}</span>
              <span className="muted text-sm" style={{marginLeft:'auto'}}>{d}/{ids.length}</span>
            </div>
            <p className="text-sm" style={{lineHeight:1.6}}>{p.thesis}</p>

            <div className="muted text-sm" style={{fontWeight:600,marginTop:4}}>Goals</div>
            <ul className="text-sm" style={{lineHeight:1.6,marginTop:4}}>
              {p.goals.map((g,i)=><li key={i}>{g}</li>)}
            </ul>

            {p.weeks.map(w=>(
              <div key={w.id} style={{borderTop:'1px solid var(--border)',paddingTop:10,marginTop:10}}>
                <div className="flex" style={{gap:8,flexWrap:'wrap',alignItems:'baseline'}}>
                  <b>{w.label}</b>
                  <span className="muted text-sm">{w.dates}</span>
                  <span className="chip">{w.theme}</span>
                </div>
                {w.items.map(it=>(
                  <label key={it.id} className="flex" style={{gap:8,alignItems:'flex-start',marginTop:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!checks[it.id]} onChange={()=>toggle(it.id)} style={{marginTop:3}} />
                    <span className="text-sm" style={{lineHeight:1.55,textDecoration:checks[it.id]?'line-through':undefined,opacity:checks[it.id]?0.6:1}}>
                      {it.text}
                      {it.note && <span className="muted"> — {it.note}</span>}
                    </span>
                  </label>
                ))}
              </div>
            ))}

            <div className="grid grid-2 mt12" style={{gap:12}}>
              <div>
                <div className="muted text-sm" style={{fontWeight:600}}>Verifiable output</div>
                <ul className="text-sm" style={{lineHeight:1.6,marginTop:4}}>
                  {p.deliverables.map((x,i)=><li key={i}>{x}</li>)}
                </ul>
              </div>
              <div>
                <div className="muted text-sm" style={{fontWeight:600}}>Early warnings</div>
                <ul className="text-sm" style={{lineHeight:1.6,marginTop:4}}>
                  {p.earlyWarnings.map((x,i)=><li key={i}>{x}</li>)}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      {tab==='targets' && (
        <>
          <div className="panel mb12">
            <h3 style={{marginTop:0}}>Weekly targets by phase</h3>
            <div className="grid" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:0}}>
              <div className="muted text-sm" style={{fontWeight:600,padding:'8px 6px',borderBottom:'1px solid var(--border)'}}>Channel</div>
              <div className="muted text-sm" style={{fontWeight:600,padding:'8px 6px',borderBottom:'1px solid var(--border)'}}>Phase 1</div>
              <div className="muted text-sm" style={{fontWeight:600,padding:'8px 6px',borderBottom:'1px solid var(--border)'}}>Phase 2</div>
              <div className="muted text-sm" style={{fontWeight:600,padding:'8px 6px',borderBottom:'1px solid var(--border)'}}>Phase 3</div>
              {weeklyTargets.map(t=>(
                <React.Fragment key={t.channel}>
                  <div className="text-sm" style={{padding:'8px 6px',borderBottom:'1px solid var(--border)'}}>{t.channel}</div>
                  <div className="text-sm" style={{padding:'8px 6px',borderBottom:'1px solid var(--border)',fontWeight:phaseNow===1?600:400}}>{t.p1}</div>
                  <div className="text-sm" style={{padding:'8px 6px',borderBottom:'1px solid var(--border)',fontWeight:phaseNow===2?600:400}}>{t.p2}</div>
                  <div className="text-sm" style={{padding:'8px 6px',borderBottom:'1px solid var(--border)',fontWeight:phaseNow===3?600:400}}>{t.p3}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3 style={{marginTop:0}}>Why these numbers</h3>
            <ul className="text-sm" style={{lineHeight:1.65}}>
              {targetsRationale.map((r,i)=><li key={i} style={{marginBottom:6}}>{r}</li>)}
            </ul>
          </div>
        </>
      )}

      {tab==='risks' && (
        <div className="grid grid-2" style={{gap:12}}>
          {failureModes.map(f=>(
            <div key={f.id} className="panel">
              <div className="flex" style={{gap:8,alignItems:'baseline'}}>
                <span className="chip">FM{f.n}</span>
                <b>{f.name}</b>
              </div>
              <div className="text-sm mt8"><span className="muted">Trigger — </span>{f.trigger}</div>
              <div className="muted text-sm" style={{fontWeight:600,marginTop:8}}>Early signals</div>
              <ul className="text-sm" style={{lineHeight:1.55,marginTop:2}}>
                {f.signals.map((s,i)=><li key={i}>{s}</li>)}
              </ul>
              <div className="muted text-sm" style={{fontWeight:600,marginTop:8}}>Response</div>
              <ul className="text-sm" style={{lineHeight:1.55,marginTop:2}}>
                {f.responses.map((s,i)=><li key={i}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab==='check' && (
        <>
          <div className="panel mb12">
            <div className="text-sm" style={{lineHeight:1.6}}>
              Thirty minutes, every Sunday. Tick a line only once you have written the
              actual number or the actual answer down — a ticked box with no figure
              behind it is how a tracker starts lying to you.
            </div>
          </div>
          {weeklyCheck.map(sec=>(
            <div key={sec.id} className="panel mb12">
              <h3 style={{marginTop:0}}>{sec.title}</h3>
              {sec.items.map(it=>(
                <label key={it.id} className="flex" style={{gap:8,alignItems:'flex-start',marginTop:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!checks[it.id]} onChange={()=>toggle(it.id)} style={{marginTop:3}} />
                  <span className="text-sm" style={{lineHeight:1.55,textDecoration:checks[it.id]?'line-through':undefined,opacity:checks[it.id]?0.6:1}}>
                    {it.text}
                    {it.note && <span className="muted"> — {it.note}</span>}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
