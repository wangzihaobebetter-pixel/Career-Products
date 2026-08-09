/* ============================================================
   Job Tracker Pro — Main views
   ============================================================ */

/* ---- GLOBAL state ---- */
let state = loadState() || JSON.parse(JSON.stringify(STARTER));

/* ==================== DASHBOARD ==================== */
function renderDashboard(){
  const counts = phaseCounts();
  const total = (state.applications||[]).length;
  const applied = counts.applied+counts.screen+counts.interview+counts.offer;
  const interviews = (state.interviews||[]).length;
  const upcoming = (state.interviews||[]).filter(i=>new Date(i.date)>=new Date()).sort((a,b)=>a.date<b.date?-1:1);
  const tasksDue = (state.tasks||[]).filter(t=>!t.done).length;
  const topScored = (state.companies||[]).slice().sort((a,b)=>b.score-a.score).slice(0,3);
  const recentApps = (state.applications||[]).slice().sort((a,b)=>b.createdAt<a.createdAt?-1:1).slice(0,5);
  const conv = applied? Math.round((counts.interview+counts.offer)/applied*100):0;

  return `
  <div class="kpi-row">
    <div class="kpi"><div class="k-num">${total}</div><div class="k-lbl">Applications</div><div class="k-sub">${applied} in flight</div></div>
    <div class="kpi"><div class="k-num">${counts.interview+counts.offer}</div><div class="k-lbl">Interviews+</div><div class="k-sub">${conv}% conver</div></div>
    <div class="kpi"><div class="k-num">${interviews}</div><div class="k-lbl">Interviews planned</div><div class="k-sub">${upcoming.length} upcoming</div></div>
    <div class="kpi"><div class="k-num">${tasksDue}</div><div class="k-lbl">Open tasks</div><div class="k-sub">across pipeline</div></div>
    <div class="kpi"><div class="k-num">${counts.offer}</div><div class="k-lbl">Offers</div><div class="k-sub">${counts.closed} closed</div></div>
  </div>

  <div class="dash-grid">
    <div class="panel">
      <div class="panel-head"><h3>Pipeline Health</h3><a href="#/pipeline" class="link">View board →</a></div>
      <div class="stage-bar">${PHASES.map(p=>{
        const c=counts[p.id]||0; const pct=total?Math.round(c/total*100):0;
        return `<div class="stage" title="${p.label}"><div class="stage-track" style="--sg:${p.color}"><div class="stage-fill" style="width:${pct}%"></div><span>${c}</span></div><div class="stage-lbl">${p.label}</div></div>`;
      }).join('')}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Top Target Companies</h3></div>
      ${topScored.length?topScored.map(c=>`<div class="row3"><span class="r3-rank">#${c.rank}</span><span class="r3-name">${esc(c.name)}</span><b>${c.score}/${c.maxScore||50}</b></div>`).join(''):emptyState('No companies yet','Import from screening or add targets')}
    </div>
  </div>

  <div class="panel" style="margin-top:14px">
    <div class="panel-head"><h3>Recent Activity</h3></div>
    ${recentApps.length?recentApps.map(a=>{
      const j=(state.roles||[]).find(r=>r.id===a.jobId);
      return `<div class="row3"><span class="r3-date">${relTime(a.createdAt)}</span><span class="r3-name">${esc(j?.title||'Role')} @ ${esc(a.companyName||'')}</span>${phaseBadge(a.phase)}</div>`;
    }).join(''):emptyState('No activity yet')}
  </div>
  `;
}
function bindDashboard(){}

/* ==================== PIPELINE (Kanban) ==================== */
function renderPipeline(){
  const apps = (state.applications||[]);
  return `
  <div class="pipeline-toolbar">
    <div class="search-wrap"><input id="pipe-search" class="search" placeholder="Filter applications…" value="${escAttr(state._pipeSearch||'')}"></div>
    <button class="btn" onclick="openApplyModal()">+ New Application</button>
    <span class="muted-sm">${apps.length} applications</span>
  </div>
  <div class="kanban" id="kanban">
    ${PHASES.map(p=>{
      const list = apps.filter(a=>{
        const j=(state.roles||[]).find(r=>r.id===a.jobId);
        const hay = (a.companyName||'')+' '+(j?.title||'')+(a.source||'');
        const okQ = !state._pipeSearch || hay.toLowerCase().includes(state._pipeSearch.toLowerCase());
        return a.phase===p.id && okQ;
      });
      return `<div class="kan-col" data-phase="${p.id}">
        <div class="kan-head" style="--pc:${p.color}">
          <span class="kan-dot"></span><span>${p.label}</span><span class="kan-count">${list.length}</span>
        </div>
        <div class="kan-body" data-phase="${p.id}">
          ${list.map(a=>appCard(a)).join('')||emptyState('Drop here','Drag apps between stages')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
function appCard(a){
  const j=(state.roles||[]).find(r=>r.id===a.jobId);
  const co=(state.companies||[]).find(c=>c.id===a.companyId);
  const dates = a.createdAt?`<div class="ac-date">${relTime(a.createdAt)}</div>`:'';
  return `<div class="app-card" draggable="true" data-app-id="${a.id}" onclick="openApplicationDetail('${a.id}')">
    <div class="ac-title">${esc(a.companyName||'')}</div>
    <div class="ac-job">${esc(j?.title||'')}</div>
    ${j?.comp?`<div class="ac-comp">${esc(j.comp)}</div>`:''}
    <div class="ac-foot">${dates}${co?`<span class="ac-tier">${esc(co.tier||'')}</span>`:''}</div>
  </div>`;
}
function bindPipeline(){
  // search
  $('#pipe-search').addEventListener('input',e=>{ state._pipeSearch=e.target.value; renderRoute(); });
  // drag & drop
  const cards = $$('.app-card');
  const cols = $$('.kan-col');
  let dragId=null;
  cards.forEach(c=>{
    c.addEventListener('dragstart',e=>{ dragId=c.dataset.appId; c.classList.add('dragging'); });
    c.addEventListener('dragend',e=>{ c.classList.remove('dragging'); cols.forEach(x=>x.classList.remove('over')); });
  });
  cols.forEach(col=>{
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave',()=>col.classList.remove('over'));
    col.addEventListener('drop',e=>{
      e.preventDefault(); col.classList.remove('over');
      if(dragId){
        const app=state.applications.find(a=>a.id===dragId);
        if(app){ app.phase=col.dataset.phase; app.lastPhaseChange=new Date().toISOString(); saveState(state); renderRoute(); toast('Moved to '+col.dataset.phase); }
      }
    });
  });
}

/* ==================== COMPANIES ==================== */
function renderCompanies(){
  const search = (state._coSearch||'').toLowerCase();
  let list=(state.companies||[]).slice();
  if(search) list=list.filter(c=>(c.name+' '+(c.category||'')+' '+(c.contactPrimary||'')).toLowerCase().includes(search));
  list.sort((a,b)=>a.rank-b.rank);
  return `
  <div class="toolbar2">
    <input class="search" id="co-search" placeholder="Search companies…" value="${escAttr(state._coSearch||'')}">
    <select id="co-tier"><option value="">All tiers</option><option>T1</option><option>T2</option><option>T3</option></select>
    <button class="btn" onclick="openCompanyModal()">+ Add Company</button>
  </div>
  <div class="co-grid">
    ${list.map(c=>{
      const apps=(state.applications||[]).filter(a=>a.companyId===c.id).length;
      return `<div class="co-card" onclick="openCompanyDetail('${c.id}')">
        <div class="co-top"><span class="rank">#${c.rank}</span><span class="co-score">${c.score}/${c.maxScore||50}</span></div>
        <div class="co-name">${esc(c.name)}</div>
        <div class="co-cat">${esc(c.category||'')} · ${esc(c.tier||'')}</div>
        <div class="co-meta"><span class="chip">${apps} apps</span>${c.priorityDays?`<span class="chip">${esc(c.priorityDays)}</span>`:''}</div>
        ${c.angle?`<div class="co-angle">${esc(c.angle.slice(0,120))}…</div>`:''}
      </div>`;
    }).join('')||emptyState('No companies','Add targets or import from screening')}
  </div>`;
}
function bindCompanies(){
  const s=$('#co-search'); if(s){
    $('#co-search').addEventListener('input',e=>{ state._coSearch=e.target.value; renderRoute(); });
    $('#co-tier').addEventListener('change',e=>{ state._coTier=e.target.value; renderRoute(); });
  }
}

/* ==================== ROLES / JOB SEARCH ==================== */
function renderRoles(){
  const search=(state._jobSearch||'').toLowerCase();
  let list=(state.roles||[]).slice();
  if(search) list=list.filter(r=>(r.title+' '+r.remote+' '+(r.comp||'')).toLowerCase().includes(search));
  list.sort((a,b)=>(b.fit||0)-(a.fit||0));
  return `
  <div class="toolbar2">
    <input class="search" id="job-search" placeholder="Search roles…" value="${escAttr(state._jobSearch||'')}">
    <button class="btn" onclick="openRoleModal()">+ Add Role</button>
    <button class="btn ghost" onclick="importScreened()">Import screened</button>
  </div>
  <div class="role-list">
    ${list.map(r=>{
      const co=(state.companies||[]).find(c=>c.id===r.companyId);
      const applied=(state.applications||[]).find(a=>a.jobId===r.id);
      return `<div class="role-row" onclick="openRoleDetail('${r.id}')">
        <div class="rr-fit" title="fit">${r.fit||'—'}</div>
        <div class="rr-main">
          <div class="rr-title">${esc(r.title)}</div>
          <div class="rr-sub">${esc(co?.name||'')}${r.remote?` · ${esc(r.remote)}`:''}</div>
        </div>
        <div class="rr-meta">
          ${r.comp?`<span class="chip">${esc(r.comp)}</span>`:''}
          ${r.expGate?`<span class="chip">${esc(r.expGate)}</span>`:''}
          ${r.visa?`<span class="chip">${esc(r.visa)}</span>`:''}
        </div>
        <div class="rr-act">${applied?phaseBadge(applied.phase):'<button class="btn sm" onclick="event.stopPropagation();applyToRole(\''+r.id+'\')">Apply</button>'}</div>
      </div>`;
    }).join('')||emptyState('No roles','Add from screening research or search results')}
  </div>`;
}
function bindRoles(){ $('#job-search').addEventListener('input',e=>{state._jobSearch=e.target.value;renderRoute();}); }

/* ==================== INTERVIEWS ==================== */
function renderInterviews(){
  const list=(state.interviews||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
  const scheduled=list.filter(i=>i.date>=todayISO());
  const past=list.filter(i=>i.date<todayISO());
  return `
  <div class="toolbar2"><button class="btn" onclick="openInterviewModal()">+ Schedule Interview</button></div>
  <div class="panel"><div class="panel-head"><h3>Upcoming</h3></div>
    ${scheduled.length?`<div class="iv-list">${scheduled.map(i=>ivCard(i)).join('')}</div>`:emptyState('No upcoming interviews','Schedule a screen or interview')}
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Past</h3></div>
    ${past.length?`<div class="iv-list">${past.map(i=>ivCard(i)).join('')}</div>`:emptyState('No past interviews')}
  </div>`;
}
function ivCard(i){
  const co=(state.companies||[]).find(c=>c.id===i.companyId);
  return `<div class="iv-row"><div class="iv-date"><b>${esc(i.date.slice(5))}</b><div class="iv-time">${esc(i.time||'')}</div></div>
  <div class="iv-main"><div class="iv-title">${esc(i.type)}</div><div class="iv-sub">${esc(co?.name||'')}${i.round?` · ${esc(i.round)}`:''}</div></div>
  ${i.status?`<span class="badge s-${i.status}">${esc(i.status)}</span>`:''}</div>`;
}
function bindInterviews(){}

/* ==================== MATERIALS ==================== */
function renderMaterials(){
  const bullets=(state.bullets||[]);
  const resumes=(state.resumes||[]);
  const covers=(state.coverLetters||[]);
  return `
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><h3>Resume Bullets</h3><button class="btn sm" onclick="copyAllBullets()">Copy all</button></div>
      <div class="bl-list">${bullets.map((b,i)=>`<div class="bl-row"><span class="bl-num">${i+1}</span><span class="bl-text">${esc(b.text)}</span><button class="copy sm" onclick="copyText('${escAttr(b.text)}')">⧉</button></div>`).join('')||emptyState('No bullets','Import from screening')}</div>
    </div>
    <div>
      <div class="panel">
        <div class="panel-head"><h3>Resume Versions</h3><button class="btn sm" onclick="addResume()">+ Add</button></div>
        ${resumes.length?resumes.map(r=>`<div class="row3"><span class="r3-name">${esc(r.name)}</span><span class="r3-date">${relTime(r.createdAt)}</span><span class="phase-pill" style="--pc:${r.isDefault?'#34d399':'#64748b'}">${r.isDefault?'default':'draft'}</span></div>`).join(''):'<span class="muted-sm">No resume versions yet</span>'}
      </div>
      <div class="panel" style="margin-top:14px">
        <div class="panel-head"><h3>Cover Letters</h3><button class="btn sm" onclick="addCover()">+ Add</button></div>
        ${covers.length?covers.map(c=>`<div class="row3"><span class="r3-name">${esc(c.title||'Cover letter')}</span><span class="r3-date">${relTime(c.createdAt)}</span></div>`).join(''):'<span class="muted-sm">No cover letters yet</span>'}
      </div>
    </div>
  </div>`;
}
function bindMaterials(){}

/* ==================== OUTREACH ==================== */
function renderOutreach(){
  const seq=(state.sequences||[]);
  return `
  <div class="toolbar2"><button class="btn" onclick="openSequenceModal()">+ New Outreach Sequence</button></div>
  <div class="seq-grid">${seq.map(s=>`<div class="seq-card"><div class="seq-title">${esc(s.title||'Sequence')}</div><div class="seq-sub">${esc(s.company||'')}</div><div class="seq-step">${esc(s.body?s.body.slice(0,160)+'…':'')}</div></div>`).join('')||emptyState('No outreach sequences','Create cold-email or follow-up sequences')}</div>
  `;
}

/* ==================== STATS ==================== */
function renderStats(){
  const counts=phaseCounts();
  const total=(state.applications||[]).length;
  const applied=counts.applied+counts.screen+counts.interview+counts.offer;
  const conv=applied?Math.round((counts.interview+counts.offer)/applied*100):0;
  const byComp={}; (state.applications||[]).forEach(a=>{byComp[a.companyName]=(byComp[a.companyName]||0)+1;});
  const topComp=Object.entries(byComp).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return `
  <div class="kpi-row">
    <div class="kpi"><div class="k-num">${total}</div><div class="k-lbl">Total</div></div>
    <div class="kpi"><div class="k-num">${applied}</div><div class="k-lbl">Applied</div></div>
    <div class="kpi"><div class="k-num">${counts.interview}</div><div class="k-lbl">Interview</div></div>
    <div class="kpi"><div class="k-num">${counts.offer}</div><div class="k-lbl">Offer</div></div>
    <div class="kpi"><div class="k-num">${conv}%</div><div class="k-lbl">Snowball rate</div></div>
  </div>
  <div class="panel"><div class="panel-head"><h3>Funnel</h3></div>
    <div class="funnel">${PHASES.map(p=>{
      const c=counts[p.id]||0; const pct=total?100:0;
      return `<div class="funnel-row"><span class="f-label" style="width:110px">${p.label}</span><div class="f-bar"><div class="f-fill" style="width:${pct}%;background:${p.color}"></div></div><span class="f-num">${c}</span></div>`;
    }).join('')}</div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Applications by Company</h3></div>
    ${topComp.length?topComp.map(([k,v])=>`<div class="row3"><span class="r3-name">${esc(k)}</span><b>${v} app${v>1?'s':''}</b></div>`).join(''):emptyState('No data yet')}
  </div>`;
}

/* ==================== SETTINGS ==================== */
function renderSettings(){
  const s=state.settings||{};
  return `
  <div class="panel" style="max-width:640px">
    <div class="panel-head"><h3>Profile</h3></div>
    <div class="form">
      <label>Name<input id="set-name" value="${escAttr(s.name||'')}"></label>
      <label>Email<input id="set-email" value="${escAttr(s.email||'')}"></label>
      <label>Target role<input id="set-role" value="${escAttr(s.targetRole||'')}"></label>
      <label>Target comp<input id="set-comp" value="${escAttr(s.targetComp||'')}"></label>
      <label class="chk"><input type="checkbox" id="set-reloc" ${s.relocate?'checked':''}> Open to relocation</label>
      <button class="btn" onclick="saveSettings()">Save Settings</button>
      <div class="muted-sm" style="margin-top:10px">Stored locally on this device. Export to backup below.</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn ghost" onclick="exportData()">Export JSON</button>
        <button class="btn ghost danger" onclick="resetData()">Reset all data</button>
      </div>
    </div>
  </div>`;
}

/* ==================== DETAIL PAGES ==================== */
function renderApplicationDetail(){
  const id=currentRoute.params.id;
  const a=(state.applications||[]).find(x=>x.id===id);
  if(!a) return emptyState('Application not found','');
  const j=(state.roles||[]).find(r=>r.id===a.jobId);
  const co=(state.companies||[]).find(c=>c.id===a.companyId);
  const iv=(state.interviews||[]).filter(i=>i.applicationId===id);
  const notes=(state.notes||[]).filter(n=>n.applicationId===id);
  return `
  <button class="btn ghost" onclick="history.back()">← Back</button>
  <div class="detail-head">
    <div><h2>${esc(a.companyName||'')}</h2><div class="muted-sm">${esc(j?.title||'')}</div></div>
    ${phaseBadge(a.phase)}
  </div>
  <div class="detail-meta">${j?.comp?`<span class="chip">${esc(j.comp)}</span>`:''}${j?.remote?`<span class="chip">${esc(j.remote)}</span>`:''}${a.source?`<span class="chip">${esc(a.source)}</span>`:''}</div>
  <div class="phase-advance">
    <span>Move stage:</span>
    ${PHASES.map(p=>`<button class="btn sm ${a.phase===p.id?'active-ph':''}" onclick="setPhase('${a.id}','${p.id}')">${p.label}</button>`).join('')}
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Activity Timeline</h3><button class="btn sm" onclick="openNoteModal('${a.id}')">+ Note</button></div>
    <div class="tl">${[...iv.map(i=>`<div class="tl-item"><span class="tl-dot" style="background:var(--accent)"></span><div><b>${esc(i.type)}</b> — ${esc(i.date.slice(5))} ${esc(i.time||'')}</div></div>`),...notes.map(n=>`<div class="tl-item"><span class="tl-dot" style="background:var(--accent2)"></span><div>${esc(n.text)}<div class="tl-time">${relTime(n.createdAt)}</div></div></div>`)].join('')||'<span class="muted-sm">No activity yet</span>'}</div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Attached</h3></div>
    ${a.resumeId?`<div class="row3"><span class="r3-name">Resume: ${esc((state.resumes||[]).find(r=>r.id===a.resumeId)?.name||'')}</span></div>`:'<span class="muted-sm">No resume attached</span>'}
  </div>`;
}
function renderCompanyDetail(){
  const id=currentRoute.params.id;
  const c=(state.companies||[]).find(x=>x.id===id);
  if(!c) return emptyState('Company not found','');
  const apps=(state.applications||[]).filter(a=>a.companyId===id);
  return `
  <button class="btn ghost" onclick="history.back()">← Back</button>
  <div class="detail-head"><div><h2>${esc(c.name)}</h2><div class="muted-sm">${esc(c.category||'')} · tier ${esc(c.tier||'')}</div></div><b style="color:var(--accent)">#${c.rank} ${c.score}/${c.maxScore||50}</b></div>
  <div class="detail-meta">${c.priorityDays?`<span class="chip">${esc(c.priorityDays)}</span>`:''}</div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Cold Email Angle</h3></div><p class="angle-text">${esc(c.angle||'')}</p></div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Contacts</h3></div>
    <div class="rl">${c.contactPrimary?`<div class="row3"><span class="r3-name">Primary: ${esc(c.contactPrimary)}</span></div>`:''}${c.contactBackup?`<div class="row3"><span class="r3-name">Backup: ${esc(c.contactBackup)}</span></div>`:''}</div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Applications (${apps.length})</h3></div>
    ${apps.length?apps.map(a=>{const j=(state.roles||[]).find(r=>r.id===a.jobId);return `<div class="row3 clickable" onclick="nav('application','${a.id}')"><span class="r3-name">${esc(j?.title||'')}</span>${phaseBadge(a.phase)}</div>`;}).join(''):emptyState('No applications for this company')}
  </div>`;
}
function renderInterviewDetail(){ return renderApplicationDetail(); }
function renderRoleDetail(){
  const id=currentRoute.params.id;
  const r=(state.roles||[]).find(x=>x.id===id);
  if(!r) return emptyState('Role not found','');
  const co=(state.companies||[]).find(c=>c.id===r.companyId);
  return `
  <button class="btn ghost" onclick="history.back()">← Back</button>
  <div class="detail-head"><div><h2>${esc(r.title)}</h2><div class="muted-sm">${esc(co?.name||'')}</div></div><b style="color:var(--accent)">${r.fit?'fit '+r.fit+'/10':''}</b></div>
  <div class="detail-meta">${r.comp?`<span class="chip">${esc(r.comp)}</span>`:''}${r.expGate?`<span class="chip">${esc(r.expGate)}</span>`:''}${r.remote?`<span class="chip">${esc(r.remote)}</span>`:''}${r.visa?`<span class="chip">${esc(r.visa)}</span>`:''}</div>
  ${r.coverHook?`<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Cover Hook</h3></div><p>${esc(r.coverHook)}</p></div>`:''}
  ${r.url?`<div style="margin-top:14px"><a class="btn" target="_blank" rel="noopener" href="${escAttr(r.url)}">Open role →</a></div>`:''}
  `;
}

/* ==================== DETAIL BIND ==================== */
function bindDetail(){}
