/* ============================================================
   Job Tracker Pro — Core data layer, storage, models, seed data
   ============================================================ */

const STORE_KEY = 'job-tracker-pro-v1';

/* ---- Application phases (mirrors Lever/Ashby funnel) ---- */
const PHASES = [
  { id: 'wishlist',  label: 'Wishlist',  color: '#64748b' },
  { id: 'applied',   label: 'Applied',   color: '#4f8bff' },
  { id: 'screen',    label: 'Screen',    color: '#7c5cff' },
  { id: 'interview', label: 'Interview', color: '#fbbf24' },
  { id: 'offer',     label: 'Offer',     color: '#34d399' },
  { id: 'closed',    label: 'Closed',    color: '#f87171' }
];

/* ---- Default state ---- */
const STARTER = {
  savedAt: new Date().toISOString(),
  companies: [],
  roles:      [],
  applications: [],
  contacts:   [],
  interviews: [],
  tasks:      [],
  notes:      [],
  resumes:    [],
  bullets:    [],
  coverLetters: [],
  sequences:  [],
  settings: { dark: true, name: 'Zihao Wang', email: 'wang.z10@northeastern.edu', targetRole: 'Analytics / Product / AI', targetComp: '$100k+', relocate: true }
};

/* ---- Persistence ---- */
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function saveState(state){
  state.savedAt = new Date().toISOString();
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch(e){ console.error('save failed', e); }
}

/* ---- ID generator ---- */
let __idCounter = 0;
function uid(prefix='id'){
  __idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${__idCounter}`;
}

/* ---- Date helpers ---- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
function relTime(iso){
  if(!iso) return '';
  const d = daysBetween(iso, new Date().toISOString());
  if(d===0) return 'today';
  if(d===1) return 'yesterday';
  if(d<0) return `in ${-d}d`;
  return `${d}d ago`;
}

/* ---- Merge seed data (from screening research) into state ---- */
function seedFromResearch(data){
  const state = JSON.parse(JSON.stringify(STARTER));
  // Companies
  state.companies = (data.companies||[]).map(c=>({
    id: uid('co'),
    rank: c.rank, name: c.name, score: c.score, maxScore: c.maxScore||50,
    category: c.category||'', tier: c.tier||'T2', priorityDays: c.priorityDays||'14天内',
    contactPrimary: c.contact?.primary||'', contactBackup: c.contact?.backup||'',
    angle: c.angle||'', status: 'new',
    createdAt: new Date().toISOString(), notes: ''
  }));
  // Roles -> applications (wishlist phase)
  state.roles = (data.roles||[]).map(r=>({
    id: uid('job'),
    companyId: null, // matched when companies load
    rank: r.rank, title: r.title, url: r.url||'',
    comp: r.comp||'', expGate: r.expGate||'', remote: r.remote||'',
    fit: r.fit||0, coverHook: r.coverHook||'', visa: r.visa||'',
    source: 'screening', createdAt: new Date().toISOString()
  }));
  // Match roles to companies by company name
  state.roles.forEach(r=>{
    const co = state.companies.find(c=>c.name.toLowerCase().includes((r.company||'').split(' ')[0].toLowerCase()));
    r.companyId = co ? co.id : null;
  });
  // Bullets
  state.bullets = (data.resumeBullets||[]).map((b,i)=>({ id: uid('bl'), text: b, tags: ['screened'], createdAt: new Date().toISOString() }));
  return state;
}
