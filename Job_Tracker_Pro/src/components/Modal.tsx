import React, { useEffect, useState } from 'react';

/* ============================================================
   Modal system — global via useModal()
   ============================================================ */
let modalHost: { open:(el:React.ReactNode)=>void; close:()=>void } | null = null;

export function useModal(){
  return {
    open: (el:React.ReactNode)=>{ modalHost?.open(el); },
    close: ()=>{ modalHost?.close(); },
  };
}

export function ModalHost(){
  const [content, setContent] = useState<React.ReactNode|null>(null);
  useEffect(()=>{
    modalHost = {
      open: (el)=>setContent(el),
      close: ()=>setContent(null),
    };
    return ()=>{ modalHost = null; };
  },[]);
  if(!content) return null;
  return (
    <div className="modal-overlay" onClick={(e)=>{ if(e.target===e.currentTarget) setContent(null); }}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose, footer }:{
  title:string; children:React.ReactNode; onClose:()=>void; footer?:React.ReactNode;
}){
  return (
    <div className="modal-overlay" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}
