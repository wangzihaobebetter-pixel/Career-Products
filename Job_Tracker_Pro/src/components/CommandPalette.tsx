import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================
   Command palette (spec P1 #38) — ⌘⇧P

   Distinct from ⌘K on purpose. ⌘K finds *things* (a job, a company,
   a contact). This runs *actions*. Mixing the two is how palettes get
   confusing: you type a company name and accidentally archive it.
   ============================================================ */

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

export function CommandPalette({ commands, onClose }:{ commands: Command[]; onClose: ()=>void }){
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const results = useMemo(()=>{
    const t = q.toLowerCase().trim();
    if(!t) return commands;
    // Subsequence match, so "mvoff" still finds "Move to Offer".
    const score = (c: Command)=>{
      const hay = (c.label+' '+c.group+' '+(c.hint||'')).toLowerCase();
      if(hay.includes(t)) return 0;
      let i = 0;
      for(const ch of t){ i = hay.indexOf(ch, i); if(i<0) return -1; i++; }
      return 1;
    };
    return commands.map(c=>({c, s:score(c)})).filter(x=>x.s>=0)
      .sort((a,b)=>a.s-b.s).map(x=>x.c);
  },[q, commands]);

  useEffect(()=>{ setSel(0); },[q]);

  const pick = (c?: Command)=>{
    if(!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="modal-overlay" data-testid="command-palette"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="qs" onClick={e=>e.stopPropagation()}>
        <input ref={inputRef} className="qs-input" placeholder="Run a command…  (↑↓ to move, ⏎ to run)"
          value={q} onChange={e=>setQ(e.target.value)}
          onKeyDown={e=>{
            if(e.key==='ArrowDown'){ e.preventDefault(); setSel(s=>Math.min(s+1, results.length-1)); }
            if(e.key==='ArrowUp'){ e.preventDefault(); setSel(s=>Math.max(s-1, 0)); }
            if(e.key==='Enter'){ e.preventDefault(); pick(results[sel]); }
            if(e.key==='Escape'){ onClose(); }
          }} />
        <div className="qs-list">
          {results.length===0 && <div className="qs-empty">No command matches “{q}”</div>}
          {results.map((c,i)=>(
            <div key={c.id} className={"qs-item"+(i===sel?' sel':'')}
              onMouseEnter={()=>setSel(i)} onClick={()=>pick(c)}>
              <span className="qs-type">{c.group}</span>
              <span className="qs-label">{c.label}</span>
              {c.hint && <span className="qs-sub">{c.hint}</span>}
            </div>
          ))}
        </div>
        <div className="qs-foot">{results.length} command{results.length===1?'':'s'} · ⌘⇧P</div>
      </div>
    </div>
  );
}
