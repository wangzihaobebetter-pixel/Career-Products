import React, { useEffect, useRef } from 'react';

/* ============================================================
   Quick Switcher — Cmd+K (spec §5.2, Linear/Raycast style)
   ============================================================ */
export interface QSResult { type:string; label:string; sub:string; id:string; view:string }

export function QuickSwitcher({ query, setQuery, results, sel, setSel, onPick, onClose }:{
  query:string; setQuery:(q:string)=>void; results:QSResult[];
  sel:number; setSel:(n:number)=>void;
  onPick:(r:QSResult)=>void; onClose:()=>void;
}){
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{ inputRef.current?.focus(); },[query]);

  useEffect(()=>{
    const h = (e:KeyboardEvent)=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); setSel(Math.min(sel+1, Math.max(results.length-1,0))); }
      if(e.key==='ArrowUp'){ e.preventDefault(); setSel(Math.max(sel-1,0)); }
      if(e.key==='Enter' && results[sel]){ onPick(results[sel]); }
      if(e.key==='Escape'){ onClose(); }
    };
    window.addEventListener('keydown', h);
    return ()=>window.removeEventListener('keydown', h);
  },[sel, results, onPick, onClose]);

  return (
    <div className="qs" onClick={e=>e.stopPropagation()}>
      <input ref={inputRef} value={query} placeholder="Search jobs, companies, contacts, templates…  (⌘K to close)"
        onChange={e=>{ setQuery(e.target.value); setSel(0); }} />
      <div className="qs-list">
        {results.length===0 && <div className="qs-item" style={{color:'var(--muted2)'}}>No results — try a different query</div>}
        {results.map((r,i)=>(
          <div key={r.type+r.id} className={"qs-item"+(i===sel?' sel':'')} onMouseEnter={()=>setSel(i)} onClick={()=>onPick(r)}>
            <span className="qs-type">{r.type}</span>
            <span style={{flex:1}}>{r.label}</span>
            <span style={{fontSize:'11px',color:'var(--muted2)'}}>{r.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
