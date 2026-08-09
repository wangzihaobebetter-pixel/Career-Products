import React, { useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { DEFAULT_STAGES } from '../store';

export default function Settings(){
  const state = useStore();
  const s = state.settings;
  const [name,setName]=useState(s.name); const [email,setEmail]=useState(s.email);
  const [targetRole,setTargetRole]=useState(s.targetRole); const [targetComp,setTargetComp]=useState(s.targetComp);
  const [theme,setTheme]=useState(s.theme); const [relocate,setRelocate]=useState(s.relocate);

  const save=()=>{
    state.setSettings({ name, email, targetRole, targetComp, theme: theme as never, relocate });
    toast('Settings saved');
  };

  const exportData=()=>{
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup exported');
  };

  const importData=()=>{
    const input = document.createElement('input');
    input.type='file'; input.accept='application/json';
    input.onchange = async ()=>{
      const f = input.files?.[0]; if(!f) return;
      try{
        const text = await f.text();
        const data = JSON.parse(text);
        state.loadBackup(data as never);
        toast('Backup restored');
      }catch{ toast('Invalid backup file'); }
    };
    input.click();
  };

  const reset=()=>{
    if(confirm('Reset ALL data to fresh state? This cannot be undone.')){
      state.resetAll();
      toast('Data reset');
    }
  };

  return (
    <div className="grid grid-2" style={{alignItems:'start',maxWidth:900}}>
      <div className="panel">
        <div className="panel-head"><h3>Profile</h3></div>
        <div className="form">
          <label>Name<input value={name} onChange={e=>setName(e.target.value)} /></label>
          <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <label>Target role<input value={targetRole} onChange={e=>setTargetRole(e.target.value)} /></label>
          <label>Target comp<input value={targetComp} onChange={e=>setTargetComp(e.target.value)} /></label>
          <label className="chk"><input type="checkbox" checked={relocate} onChange={e=>setRelocate(e.target.checked)}/> Open to relocation</label>
          <label>Theme<select value={theme} onChange={e=>setTheme(e.target.value as typeof theme)}>
            <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
          </select></label>
          <button className="btn primary" onClick={save}>Save Settings</button>
        </div>
      </div>

      <div>
        <div className="panel">
          <div className="panel-head"><h3>Pipeline Stages</h3></div>
          <div className="muted text-sm mb12">Stages are customizable. Current default set:</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {DEFAULT_STAGES.map(st=>(
              <div key={st.id} className="flex" style={{gap:8,fontSize:12.5}}>
                <span className="kan-dot" style={{background:st.color}}/>
                <span>{st.label}</span>
                <span className="muted2" style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:11}}>{st.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Data</h3></div>
          <div className="flex" style={{flexWrap:'wrap',gap:8}}>
            <button className="btn" onClick={exportData}>⬇ Export JSON</button>
            <button className="btn" onClick={importData}>⬆ Import JSON</button>
            <button className="btn danger" onClick={reset}>Reset all</button>
          </div>
          <div className="muted2 text-sm mt12">All data is stored locally in this browser. No telemetry, no backend, no uploads. Export regularly as backup.</div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>Storage</h3></div>
          <div className="muted text-sm">localStorage usage estimate: <b>{Math.round(JSON.stringify(state).length/1024)} KB</b> (5 MB limit)</div>
        </div>

        <div className="panel mt12">
          <div className="panel-head"><h3>About</h3></div>
          <div className="muted text-sm">Job Tracker Pro v2.0<br/>Spec-driven build: 16 data models, 8 modules (Pipeline / Discovery / Companies / Interview Prep / Materials / Outreach / Stats / Settings).<br/>Keyboard: ⌘K quick switch · ⌘N new job · Esc close</div>
        </div>
      </div>
    </div>
  );
}
