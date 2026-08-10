#!/usr/bin/env node
/* Lint the Live Openings dataset.
 *
 * This exists because the first version of the miner shipped prose into the UI:
 * a visa-sponsorship sentence and a "JD" label rendered as job cards, and 100
 * URLs carried the markdown fence backtick they were written inside. Those are
 * not bugs you notice in a render test — every card still rendered fine. They
 * are only visible as a data contract, so the contract is asserted here.
 */
import { readFileSync } from 'node:fs';

const FILE = new URL('./src/data/liveOpenings.ts', import.meta.url);
const src = readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
};

const rows = [...src.matchAll(/\{ id:'([^']*)', company:'((?:[^'\\]|\\.)*)', title:'((?:[^'\\]|\\.)*)', location:'((?:[^'\\]|\\.)*)', salary:'((?:[^'\\]|\\.)*)', level:'((?:[^'\\]|\\.)*)', tags:'((?:[^'\\]|\\.)*)', note:'((?:[^'\\]|\\.)*)', url:'((?:[^'\\]|\\.)*)', source:'([^']*)', verify:'([^']*)' \}/g)]
  .map(m => ({ id: m[1], company: m[2], title: m[3], url: m[9], source: m[10], verify: m[11] }));

const declared = (src.match(/\{ id:'lo_/g) || []).length;
ok('every row parses', rows.length === declared, `${rows.length}/${declared}`);
ok('dataset is not empty', rows.length > 100, `${rows.length} rows`);

const badUrl = rows.filter(r => !/^https?:\/\/[^\s`'"<>]+\.[^\s`'"<>]+$/.test(r.url));
ok('every URL is a bare absolute URL', badUrl.length === 0, badUrl.slice(0, 3).map(r => r.url).join(' | ') || 'clean');

const trailing = rows.filter(r => /[`'"<>)\]},;.]$/.test(r.url));
ok('no URL ends in markdown or sentence punctuation', trailing.length === 0, trailing.slice(0, 3).map(r => r.url).join(' | ') || 'clean');

const seen = new Map();
const dupes = [];
for (const r of rows) {
  const k = r.url.toLowerCase().replace(/\/$/, '');
  if (seen.has(k)) dupes.push(r.url); else seen.set(k, r.id);
}
ok('no duplicate postings', dupes.length === 0, dupes.slice(0, 2).join(' | ') || 'clean');

const quoted = rows.filter(r => /^["“'\[]/.test(r.title.trim()));
ok('no title is a quoted sentence', quoted.length === 0, quoted.slice(0, 2).map(r => r.title.slice(0, 50)).join(' | ') || 'clean');

const symbol = rows.filter(r => /^[^\p{L}\p{N}(]/u.test(r.title.trim()));
ok('no title starts with an emoji or marker', symbol.length === 0, symbol.slice(0, 2).map(r => r.title.slice(0, 50)).join(' | ') || 'clean');

const cjk = rows.filter(r => /[一-鿿]/.test(r.title));
ok('no title is Chinese commentary', cjk.length === 0, cjk.slice(0, 2).map(r => r.title.slice(0, 50)).join(' | ') || 'clean');

const stub = rows.filter(r => r.title.trim().length < 4);
ok('no stub titles', stub.length === 0, stub.slice(0, 2).map(r => r.id).join(' | ') || 'clean');

const jdLabel = rows.filter(r => /\bJD$/.test(r.title.trim()));
ok('no row is a JD document label', jdLabel.length === 0, jdLabel.slice(0, 2).map(r => r.title).join(' | ') || 'clean');

const noCompany = rows.filter(r => !r.company.trim());
ok('every row names a company', noCompany.length === 0, noCompany.length ? String(noCompany.length) : 'clean');

const noSource = rows.filter(r => !/\.md$/.test(r.source));
ok('every row cites the report file it came from', noSource.length === 0, noSource.length ? String(noSource.length) : 'clean');

const badVerify = rows.filter(r => r.verify !== 'reachable' && r.verify !== 'blocked');
ok('verify is only reachable or blocked', badVerify.length === 0, badVerify.slice(0, 2).map(r => r.verify).join(' | ') || 'clean');

const checkedAt = (src.match(/liveOpeningsCheckedAt = '([^']*)'/) || [, ''])[1];
ok('checkedAt is an ISO date', /^\d{4}-\d{2}-\d{2}$/.test(checkedAt), checkedAt);
ok('checkedAt is not in the future', new Date(checkedAt) <= new Date(), checkedAt);

// The badge promises a check date. If the data is older than a quarter the promise
// has quietly expired — better to be told at build time than to mislead a user.
const ageDays = Math.round((Date.now() - new Date(checkedAt).getTime()) / 86400000);
ok('link check is less than 90 days old', ageDays < 90, `${ageDays} days old — re-run tools/recheck-openings.mjs`);

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);
