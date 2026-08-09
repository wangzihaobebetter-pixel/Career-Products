/* ============================================================
   Job Tracker Pro — UI helpers, router, render
   ============================================================ */

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escAttr = s=>esc(s).replace(/"/g,'&quot;');

/* ---- Router (hash-based) ---- */
let currentRoute = { view:'dashboard', params:{} };
function parseHash(){
  const h = location.hash.replace(/^#\/?/,'');
  const parts = h.split('/').filter(Boolean);
  return { view: parts[0]||'dashboard', params: { id: parts[1] || null } };
}
function nav(view, id){
  location.hash = id ? `#/${view}/${id}` : `#/${view}`;
}
function renderRoute(){
  currentRoute = parseHash();
  const v = currentRoute.view;
  const views = { dashboard:renderDashboard, pipeline:renderPipeline, companies:renderCompanies,
                  roles:renderRoles, interviews:renderInterviews, materials:renderMaterials,
                  outreach:renderOutreach, stats:renderStats, settings:renderSettings,
                  interview:renderInterviewDetail, application:renderApplicationDetail, company:renderCompanyDetail };
  const fn = views[v] || views.dashboard;
  $('#app').innerHTML = `<div class="viewhead"><h1>${VIEW_TITLES[v]||'Dashboard'}</h1></div><div class="viewbody">${fn()}</div>`;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  afterRender(v);
}
function afterRender(v){
  if(v==='pipeline') bindPipeline();
  if(v==='dashboard') bindDashboard();
  if(v==='materials') bindMaterials();
  if(v==='interviews') bindInterviews();
}

const VIEW_TITLES = {
  dashboard:'Dashboard', pipeline:'Application Pipeline', companies:'Target Companies',
  roles:'Job Search', interviews:'Interviews & Prep', materials:'Resume & Materials',
  outreach:'Outreach & Follow-up', stats:'Stats & Insights', settings:'Settings'
};

/* ---- Shared components ---- */
function phaseBadge(phaseId){
  const p = PHASES.find(x=>x.id===phaseId)||PHASES[0];
  return `<span class="phase-pill" style="--pc:${p.color}">${p.label}</span>`;
}
function emptyState(title, sub){
  return `<div class="empty"><strong>${esc(title)}</strong>${sub?`<p>${esc(sub)}</p>`:''}</div>`;
}
function modal(html){
  const m = document.createElement('div');
  m.className='modal'; m.innerHTML=`<div class="modal-card">${html}</div>`;
  m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
  document.body.appendChild(m);
  return m;
}
function toast(msg){
  let t = $('#toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

/* ---- Counts by phase for nav badging ---- */
function phaseCounts(){
  const c = {};
  PHASES.forEach(p=>c[p.id]=0);
  (state.applications||[]).forEach(a=>{ if(c[a.phase]!=null) c[a.phase]+=1; });
  return c;
}
