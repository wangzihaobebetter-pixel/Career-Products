import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs'; import path from 'node:path';
const root = "/Users/zihaowang/Desktop/Open claw/Career Products/Job_Tracker_Pro";
const distDir = path.join(root,'dist');
const html = fs.readFileSync(path.join(distDir,'index.html'),'utf8');
const assetDir = path.join(distDir,'assets');
const jsFile = fs.readdirSync(assetDir).find(f=>f.endsWith('.js'));
const bundle = fs.readFileSync(path.join(assetDir,jsFile),'utf8');
const vc = new VirtualConsole();
const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g,''),{runScripts:'dangerously',url:'http://localhost:5173/',pretendToBeVisual:true,virtualConsole:vc});
const {window}=dom;
window.matchMedia = window.matchMedia||((q)=>({matches:false,media:q,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}));
window.scrollTo=()=>{};
const s=window.document.createElement('script'); s.type='module'; s.textContent=bundle; window.document.body.appendChild(s);
const settle=(ms)=>new Promise(r=>setTimeout(r,ms));
await settle(300);
if(!window.document.getElementById('root').children.length){ window.eval(bundle); await settle(500); }
const doc=window.document;
const navs=[...doc.querySelectorAll('.nav-item')];
for(const want of ['Interview','Stats','Settings']){
  const btn = navs.find(b=>b.textContent.includes(want) && !b.textContent.includes('Prep'));
  if(!btn){ console.log('NO NAV FOR',want); continue; }
  btn.dispatchEvent(new window.MouseEvent('click',{bubbles:true})); await settle(200);
  console.log('\n===== '+btn.textContent.trim()+' =====');
  console.log((doc.querySelector('.content')?.textContent||'').trim().slice(0,900));
}
