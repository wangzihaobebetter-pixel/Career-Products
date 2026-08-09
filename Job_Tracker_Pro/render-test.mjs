import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';

const dist = process.argv[2];
const html = fs.readFileSync(path.join(dist,'index.html'),'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: '+e.message));
vc.on('error', (...a) => errors.push('console.error: '+a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost/',
  virtualConsole: vc,
  pretendToBeVisual: true,
});
// load the bundle manually (jsdom resource loader can't fetch file paths from /assets)
const assetDir = path.join(dist,'assets');
const js = fs.readdirSync(assetDir).find(f=>f.endsWith('.js'));
const code = fs.readFileSync(path.join(assetDir,js),'utf8');

// minimal polyfills
dom.window.matchMedia = dom.window.matchMedia || (q => ({matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}}));
dom.window.scrollTo = ()=>{};
if(!dom.window.crypto.randomUUID) dom.window.crypto.randomUUID = ()=> 'x'+Math.random().toString(36).slice(2);

try {
  dom.window.eval(code);
} catch(e) { errors.push('EVAL: '+e.message); }

await new Promise(r=>setTimeout(r, 1500));

const doc = dom.window.document;
const txt = doc.body.textContent || '';
const report = {
  bodyChars: txt.length,
  rootChildren: doc.getElementById('root')?.children.length ?? 0,
  navItems: [...doc.querySelectorAll('.nav-item, nav a, aside a, aside button')].map(e=>e.textContent.trim()).filter(Boolean),
  kpiCount: doc.querySelectorAll('.kpi, .kpi-card, .stat-card').length,
  errors,
};
console.log(JSON.stringify(report,null,2));
console.log('--- first 600 chars of rendered text ---');
console.log(txt.slice(0,600));
