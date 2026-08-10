import React, { useMemo } from 'react';
import { useStore } from '../store';

export default function Stats(){
  const state = useStore();
  const jobs = state.jobs;

  const funnel = useMemo(()=>{
    return state.stages.map(st=>({ ...st, count: jobs.filter(j=>j.status===st.id).length }));
  },[state.stages, jobs]);

  const applied = jobs.filter(j=>['applied','phone_screen','technical','onsite','final','offer','negotiating'].includes(j.status)).length;
  const interviewed = jobs.filter(j=>['phone_screen','technical','onsite','final','offer','negotiating'].includes(j.status)).length;
  const offers = jobs.filter(j=>['offer','negotiating','accepted'].includes(j.status)).length;
  const accepted = jobs.filter(j=>j.status==='accepted').length;

  const convToInterview = applied? Math.round(interviewed/applied*100):0;
  const convToOffer = interviewed? Math.round(offers/interviewed*100):0;

  // Salary distribution
  const salaries = jobs.filter(j=>j.salaryMin).map(j=>j.salaryMin||0).sort((a,b)=>a-b);
  const salMed = salaries.length? salaries[Math.floor(salaries.length/2)]:0;

  // Applications by company
  const byCompany: Record<string, number> = {};
  jobs.forEach(j=>{ const co=state.companies.find(c=>c.id===j.companyId); const k=co?.name||'Unknown'; byCompany[k]=(byCompany[k]||0)+1; });
  const topCompanies = Object.entries(byCompany).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Source breakdown
  const bySource: Record<string, number> = {};
  jobs.forEach(j=>{ bySource[j.source]=(bySource[j.source]||0)+1; });

  // Weekly velocity (last 8 weeks)
  const weeks: { label:string; count:number }[] = [];
  for(let w=7; w>=0; w--){
    const start = new Date(); start.setDate(start.getDate()-start.getDay()-w*7);
    const end = new Date(start); end.setDate(end.getDate()+7);
    const count = jobs.filter(j=>{ const d=new Date(j.createdAt); return d>=start && d<end; }).length;
    weeks.push({ label: start.toLocaleString('en-US',{month:'short',day:'numeric'}), count });
  }
  const maxWeek = Math.max(1, ...weeks.map(w=>w.count));

  return (
    <div>
      <div className="kpi-row">
        <div className="kpi"><div className="k-num">{jobs.length}</div><div className="k-lbl">Total applications</div></div>
        <div className="kpi"><div className="k-num">{applied}</div><div className="k-lbl">Applied / in-flight</div></div>
        <div className="kpi"><div className="k-num">{interviewed}</div><div className="k-lbl">Interviewed</div></div>
        <div className="kpi"><div className="k-num">{offers}</div><div className="k-lbl">Offers</div></div>
        <div className="kpi"><div className="k-num">{accepted}</div><div className="k-lbl">Accepted</div></div>
      </div>

      <div className="grid grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Funnel Conversion</h3></div>
          <div className="funnel">
            {funnel.map(st=>(
              <div className="funnel-row" key={st.id}>
                <span className="f-label">{st.label}</span>
                <div className="f-bar"><div className="f-fill" style={{width: (st.count? Math.max(5, st.count/Math.max(1,jobs.length)*100) : 0)+'%', background:st.color}}/></div>
                <span className="f-num">{st.count}</span>
              </div>
            ))}
          </div>
          <div className="mt12 text-sm muted">Applied → Interview: <b>{convToInterview}%</b> · Interview → Offer: <b>{convToOffer}%</b> · Median salary: <b>${salMed>=1000? Math.round(salMed/1000)+'k':salMed}</b></div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Weekly Applications</h3></div>
          <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120,padding:'10px 4px'}}>
            {weeks.map((w,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{height: Math.max(3, w.count/maxWeek*90), background:'var(--accent)', borderRadius:'4px 4px 0 0', width:'70%', opacity:.85}}/>
                <span style={{fontSize:9.5,color:'var(--muted2)',writingMode:'vertical-rl',transform:'rotate(180deg)'}}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>By Company</h3></div>
          {topCompanies.map(([k,v])=>(
            <div className="row" key={k}><span className="r-name">{k}</span><b style={{fontSize:12.5}}>{v} app{v>1?'s':''}</b></div>
          ))}
          {topCompanies.length===0 && <div className="muted text-sm">No data yet</div>}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>By Source</h3></div>
          {Object.entries(bySource).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
            <div className="row" key={k}><span className="r-name">{k}</span><b style={{fontSize:12.5}}>{v}</b></div>
          ))}
          {Object.keys(bySource).length===0 && <div className="muted text-sm">No data yet</div>}
        </div>

        <GoalPanel />
      </div>
    </div>
  );
}

/* ================================================================
   Goal tracking (spec P1 #28)

   Progress is *derived*, never stored: a goal is a target plus a
   window, and the count comes from the same events the rest of the app
   already records. A manually incremented counter would drift the
   moment you edit an application, and a job search where the numbers
   quietly lie is worse than one with no numbers at all.
   ================================================================ */
const GOAL_LABEL: Record<string, string> = {
  applications_sent: 'Applications sent',
  interviews_completed: 'Interviews completed',
  offers_received: 'Offers received',
  networking_conversations: 'Networking conversations',
  follow_ups_sent: 'Follow-ups sent',
};

export function GoalPanel(){
  const state = useStore();

  const rows = useMemo(()=>state.goals.map(g=>{
    const from = new Date(g.startDate).getTime();
    const to = new Date(g.endDate).getTime();
    const inWindow = (iso?: string)=>{
      if(!iso) return false;
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t>=from && t<=to;
    };

    let actual = 0; let basis = '';
    switch(g.metric){
      case 'applications_sent':
        // The stage-history entry is the evidence an application was sent.
        actual = state.jobs.filter(j=>j.stageHistory.some(h=>h.to==='applied' && inWindow(h.at))).length;
        basis = 'jobs whose history records an "applied" transition in this window';
        break;
      case 'interviews_completed':
        actual = state.interviews.filter(i=>inWindow(i.scheduledAt) && new Date(i.scheduledAt).getTime()<=Date.now()).length;
        basis = 'interviews scheduled in this window whose date has passed';
        break;
      case 'offers_received':
        actual = state.offers.filter(o=>inWindow(o.createdAt)).length;
        basis = 'offer records created in this window';
        break;
      case 'networking_conversations':
        actual = state.contacts.filter(c=>inWindow(c.lastContactedAt)).length
               + state.contacts.reduce((n,c)=>n + (c.interactionLog||[]).filter(l=>inWindow(l.date)).length, 0);
        basis = 'contacts touched plus logged interactions in this window';
        break;
      case 'follow_ups_sent':
        actual = state.tasks.filter(t=>t.type==='follow_up' && t.status==='done' && inWindow(t.completedAt)).length
               + state.interviews.filter(i=>inWindow(i.followUpSentAt)).length;
        basis = 'completed follow-up tasks plus logged thank-you notes';
        break;
    }

    const pct = g.target>0? Math.min(100, Math.round(actual/g.target*100)) : 0;
    const daysLeft = Math.ceil((to - Date.now())/86_400_000);
    return { g, actual, pct, daysLeft, basis };
  }),[state.goals, state.jobs, state.interviews, state.offers, state.contacts, state.tasks]);

  return (
    <div className="panel" data-testid="goal-panel">
      <div className="panel-head"><h3>Goals</h3></div>
      {rows.length===0 && <div className="muted text-sm">No goals set. Goals turn "I should apply more" into a number you can miss.</div>}
      {rows.map(({g, actual, pct, daysLeft, basis})=>(
        <div className="goal-row" key={g.id}>
          <div className="goal-top">
            <span className="g-name">{GOAL_LABEL[g.metric] || g.metric}</span>
            <span className="muted2" style={{fontSize:11}}>per {g.period}</span>
            <span className="g-num">{actual}/{g.target} · {pct}%</span>
          </div>
          <div className="goal-bar">
            <span style={{width: pct+'%', background: pct>=100? 'var(--good)' : pct>=50? 'var(--accent)' : 'var(--warn)'}}/>
          </div>
          <div className="goal-why">
            {daysLeft>=0
              ? `${daysLeft} day${daysLeft===1?'':'s'} left in the window · counted from ${basis}.`
              : `Window closed ${Math.abs(daysLeft)} day${Math.abs(daysLeft)===1?'':'s'} ago · counted from ${basis}.`}
          </div>
        </div>
      ))}
    </div>
  );
}
