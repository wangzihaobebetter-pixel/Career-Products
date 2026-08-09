/* ============================================================
   Job Tracker Pro — Actions / Modals
   ============================================================ */

/* ---- New Application ---- */
function openApplyModal(){
  const roles=state.roles||[];
  const companies=state.companies||[];
  const m=modal(`
    <h3>New Application</h3>
    <div class="form">
      <label>Company ${companies.length?`<select id="mo-company">${companies.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}<option value="">(custom)</option></select>`:'<input id="mo-company-custom" placeholder="Company name">'}</label>
      <label>Role ${roles.length?`<select id="mo-role"><option value="">(no role)</option>${roles.map(r=>`<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select>`:'<input id="mo-role-custom" placeholder="Role title">'}</label>
      <label>Source<input id="mo-source" placeholder="e.g. LinkedIn, Ashby, referral"></label>
      <label>URL<input id="mo-url" placeholder="Application URL"></label>
      <label>Notes<textarea id="mo-notes" rows="3" placeholder="Relevant details…"></textarea></label>
      <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitApply()">Add Application</button></div>
    </div>`);
}
function submitApply(){
  const co=state.companies.find(c=>c.id===$('#mo-company')?.value);
  const coCustom=$('#mo-company-custom')?.value;
  const roleSel=$('#mo-role')?.value;
  const roleCustom=$('#mo-role-custom')?.value;
  const companyName=co?.name||coCustom||'';
  const roleTitle=$(roleSel?'#mo-role':null);
  let jobId=roleSel||null;
  // create role if custom
  const j=(state.roles||[]).find(r=>r.id===jobId);
  if(roleCustom && !j){ const nr={id:uid('job'),companyId:co?.id||null,title:roleCustom,createdAt:new Date().toISOString()}; state.roles.push(nr); jobId=nr.id; }
  const app={ id:uid('app'), phase:'wishlist', phaseHistory:[{phase:'wishlist',at:new Date().toISOString()}],
    companyId:co?.id||null, companyName, jobId, source:$('#mo-source')?.value||'', url:$('#mo-url')?.value||'',
    createdAt:new Date().toISOString() };
  state.applications.push(app);
  if($('#mo-notes')?.value){ state.notes.push({id:uid('note'),applicationId:app.id,text:$('#mo-notes').value,createdAt:new Date().toISOString()}); }
  saveState(state); closeModal(); renderRoute(); toast('Application added');
}

/* ---- Add Company ---- */
function openCompanyModal(){ const m=modal(`
  <h3>Add Company</h3><div class="form">
    <label>Name<input id="co-name"></label>
    <label>Category<input id="co-cat"></label>
    <label>Tier<select id="co-tier"><option>T1</option><option selected>T2</option><option>T3</option></select></label>
    <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitCompany()">Add</button></div></div>`); }
function submitCompany(){
  const rank=(state.companies||[]).length+1;
  state.companies.push({id:uid('co'),rank,name:$('#co-name').value,category:$('#co-cat').value,tier:$('#co-tier').value,score:0,maxScore:50,status:'new',createdAt:new Date().toISOString()});
  saveState(state); closeModal(); renderRoute(); toast('Company added');
}

/* ---- Add Role ---- */
function openRoleModal(){ const m=modal(`<h3>Add Role</h3><div class="form">
  <label>Title<input id="ro-title"></label>
  <label>Company<input id="ro-company"></label>
  <label>Comp<input id="ro-comp" placeholder="e.g. 135-175k"></label>
  <label>Fit<select id="ro-fit"><option>9</option><option>8</option><option>7</option><option>6</option></select></label>
  <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitRole()">Add</button></div></div>`); }
function submitRole(){
  state.roles.push({id:uid('job'),title:$('#ro-title').value,companyId:null,comp:$('#ro-comp').value,fit:+$('#ro-fit').value,createdAt:new Date().toISOString(),company:$('#ro-company').value});
  saveState(state); closeModal(); renderRoute(); toast('Role added');
}

/* ---- Interview ---- */
function openInterviewModal(){ if(currentRoute?.params?.id) shareAppId=currentRoute.params.id; const m=modal(`<h3>Schedule Interview</h3><div class="form">
  <label>Type<select id="iv-type"><option>Phone screen</option><option>Technical</option><option>Behavioral</option><option>Onsite</option><option>Take-home</option></select></label>
  <label>Date<input type="date" id="iv-date"></label><label>Time<input type="time" id="iv-time"></label>
  <label>Round<input id="iv-round" placeholder="e.g. Round 1"></label>
  <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitInterview()">Schedule</button></div></div>`); }
let shareAppId=null;
function submitInterview(){
  state.interviews.push({id:uid('iv'),applicationId:shareAppId,type:$('#iv-type').value,date:$('#iv-date').value,time:$('#iv-time').value,round:$('#iv-round').value,status:'scheduled',createdAt:new Date().toISOString()});
  saveState(state); closeModal(); renderRoute(); toast('Interview scheduled'); shareAppId=null;
}

/* ---- Note ---- */
function openNoteModal(appId){ const m=modal(`<h3>Add Note</h3><div class="form">
  <textarea id="note-text" rows="4" placeholder="Progress, feedback, next steps…"></textarea>
  <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitNote('${appId}')">Save</button></div></div>`); }
function submitNote(appId){ state.notes.push({id:uid('note'),applicationId:appId,text:$('#note-text').value,createdAt:new Date().toISOString()}); saveState(state); closeModal(); renderRoute(); toast('Note saved'); }

/* ---- Sequence ---- */
function openSequenceModal(){ const m=modal(`<h3>New Outreach Sequence</h3><div class="form">
  <label>Title<input id="sq-title" placeholder="e.g. Klaviyo cold email"></label>
  <label>Company<input id="sq-company"></label>
  <label>Body<textarea id="sq-body" rows="6" placeholder="Email draft…"></textarea></label>
  <div class="modal-actions"><button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button><button class="btn" onclick="submitSequence()">Save</button></div></div>`); }
function submitSequence(){ state.sequences.push({id:uid('seq'),title:$('#sq-title').value,company:$('#sq-company').value,body:$('#sq-body').value,createdAt:new Date().toISOString()}); saveState(state); closeModal(); renderRoute(); toast('Sequence saved'); }

/* ---- Materials ---- */
function addResume(){ state.resumes.push({id:uid('res'),name:'Resume '+((state.resumes||[]).length+1),isDefault:(state.resumes||[]).length===0,createdAt:new Date().toISOString()}); saveState(state); renderRoute(); }
function addCover(){ state.coverLetters.push({id:uid('cov'),title:'Cover letter '+(state.coverLetters.length+1),createdAt:new Date().toISOString()}); saveState(state); renderRoute(); }
function copyAllBullets(){ const txt=state.bullets.map((b,i)=>`${i+1}. ${b.text}`).join('\n'); navigator.clipboard.writeText(txt); toast('Copied '+state.bullets.length+' bullets'); }
function copyText(t){ navigator.clipboard.writeText(t); toast('Copied'); }

/* ---- Milestones / helpers ---- */
function setPhase(appId,phase){ const a=state.applications.find(x=>x.id===appId); if(a){ a.phase=phase; a.lastPhaseChange=new Date().toISOString(); a.phaseHistory=a.phaseHistory||[]; a.phaseHistory.push({phase,at:new Date().toISOString()}); saveState(state); renderRoute(); toast('Moved to '+phase); } }
function applyToRole(roleId){ const r=state.roles.find(x=>x.id===roleId); if(!r) return; const app={id:uid('app'),phase:'applied',phaseHistory:[{phase:'applied',at:new Date().toISOString()}],companyId:r.companyId,companyName:(state.companies.find(c=>c.id===r.companyId))?.name||'',jobId:roleId,source:'manual',createdAt:new Date().toISOString()}; state.applications.push(app); saveState(state); renderRoute(); toast('Marked as applied'); }
function openApplicationDetail(id){ nav('application',id); }

/* ---- Import screened research ---- */
async function importScreened(){
  const resp=await fetch('./seeded-data.js');
  if(!resp.ok){ toast('Seed file missing'); return; }
  eval(await resp.text()); // defines window.SCREEN_SEED
  const merged=seedFromResearch(window.SCREEN_SEED);
  // keep current state, merge new
  state.companies=merged.companies; state.roles=merged.roles;
  if(merged.bullets.length) state.bullets=merged.bullets;
  // applications from wishlist roles
  state.applyLink=merged.roles.map(r=>({jobId:r.id,companyId:r.companyId,companyName:(state.companies.find(c=>c.id===r.companyId))?.name||''}));
  saveState(state); renderRoute(); toast('Screened data imported ('+state.companies.length+' companies, '+state.roles.length+' roles)');
}

/* ---- Export / reset ---- */
function exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='job-tracker-backup-'+todayISO()+'.json'; a.click(); toast('Exported'); }
function resetData(){ if(confirm('Reset all data? This cannot be undone.')){ state=JSON.parse(JSON.stringify(STARTER)); saveState(state); renderRoute(); toast('Data reset'); } }
function saveSettings(){ const s=state.settings||{}; s.name=$('#set-name').value; s.email=$('#set-email').value; s.targetRole=$('#set-role').value; s.targetComp=$('#set-comp').value; s.relocate=$('#set-reloc').checked; state.settings=s; saveState(state); toast('Settings saved'); }

/* ---- Modal close helper ---- */
function closeModal(){ const m=document.querySelector('.modal'); if(m) m.remove(); }
