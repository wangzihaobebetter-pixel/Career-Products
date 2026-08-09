import React, { useEffect, useState } from 'react';

/* ============================================================
   Toast / Snackbar system with undo
   ============================================================ */
interface ToastItem { id:number; msg:string; undo?:()=>void }

let toastHost: { push:(t:ToastItem)=>void } | null = null;
let toastSeq = 0;

export function toast(msg:string, undo?:()=>void){
  toastHost?.push({ id: ++toastSeq, msg, undo });
}

export function ToastHost(){
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(()=>{
    toastHost = { push:(t)=>setItems(prev=>[...prev, t]) };
    return ()=>{ toastHost = null; };
  },[]);

  useEffect(()=>{
    if(!items.length) return;
    const t = setTimeout(()=>setItems(prev=>prev.slice(1)), 6000);
    return ()=>clearTimeout(t);
  },[items]);

  return <div id="toast-wrap">
    {items.map(t=>(
      <div key={t.id} className="toast">
        <span>{t.msg}</span>
        {t.undo && <span className="undo" onClick={()=>{ t.undo?.(); setItems(prev=>prev.filter(x=>x.id!==t.id)); }}>Undo</span>}
      </div>
    ))}
  </div>;
}
