#!/usr/bin/env node
/* Re-check every Live Openings URL and rewrite `verify` + the checkedAt date.
 *
 * The badge in the UI says "URL answered 200 on <date>". That sentence is only
 * honest if the date is real and recent, so this has to be re-runnable. It never
 * upgrades a row's claim beyond what the response supports:
 *   200/3xx        -> reachable
 *   401/403/429    -> blocked  (host refuses robots; unknown, not dead)
 *   404/410        -> dropped  (the posting is gone)
 *   network error  -> keep the previous state, do not invent a downgrade
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, '..', 'src', 'data', 'liveOpenings.ts');
const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;

const src = readFileSync(FILE, 'utf8');
const startIdx = src.indexOf('export const liveOpenings');
const arrStart = src.indexOf('= [', startIdx) + 2;
const head = src.slice(0, arrStart + 1);
const body = src.slice(arrStart + 1, src.lastIndexOf(']'));
const tail = src.slice(src.lastIndexOf(']'));
const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));

const urlOf = l => (l.match(/\burl:'([^']*)'/) || [, ''])[1];

async function probe(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36' };
  try {
    // HEAD first: cheaper, and most boards answer it. Some return 405, so fall
    // back to a GET rather than recording a false "blocked".
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal, headers });
    if (r.status === 405 || r.status === 501) {
      r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers });
    }
    return r.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

function classify(status, prev) {
  if (status >= 200 && status < 400) return 'reachable';
  if (status === 404 || status === 410) return 'dead';
  if (status === 0) return prev;             // our network hiccup is not evidence
  return 'blocked';
}

const results = new Array(lines.length);
let cursor = 0;
let done = 0;

async function worker() {
  while (cursor < lines.length) {
    const i = cursor++;
    const prev = (lines[i].match(/verify:'([^']*)'/) || [, 'blocked'])[1];
    const status = await probe(urlOf(lines[i]));
    results[i] = classify(status, prev);
    if (++done % 50 === 0) process.stderr.write(`  ${done}/${lines.length}\n`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const kept = [];
let dead = 0, changed = 0;
lines.forEach((l, i) => {
  const prev = (l.match(/verify:'([^']*)'/) || [, ''])[1];
  if (results[i] === 'dead') { dead++; return; }
  if (results[i] !== prev) changed++;
  kept.push(l.replace(/verify:'[^']*'/, `verify:'${results[i]}'`));
});

const today = new Date().toISOString().slice(0, 10);
let out = head + '\n  ' + kept.join('\n  ') + '\n' + tail;
out = out.replace(/liveOpeningsCheckedAt = '[^']*'/, `liveOpeningsCheckedAt = '${today}'`);
writeFileSync(FILE, out, 'utf8');

const reach = kept.filter(l => /verify:'reachable'/.test(l)).length;
console.log(JSON.stringify({ checked: lines.length, kept: kept.length, dropped404: dead, changed, reachable: reach, blocked: kept.length - reach, checkedAt: today }, null, 2));
