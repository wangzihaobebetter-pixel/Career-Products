#!/usr/bin/env node
/* Clean src/data/liveOpenings.ts in place.
 *
 * The generator lifted rows straight out of markdown tables, which means it also
 * lifted things that are not postings: a sentence about visa sponsorship that
 * happened to sit in a table cell, a "JD" label, a row of commentary. It also
 * kept the trailing backtick when a URL was written as `https://…` in markdown.
 *
 * This pass is deliberately destructive-in-one-direction: it only drops rows and
 * trims strings, never invents or rewrites a posting. Run with --dry to see what
 * it would do without touching the file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, '..', 'src', 'data', 'liveOpenings.ts');
const DRY = process.argv.includes('--dry');

const src = readFileSync(FILE, 'utf8');
const startIdx = src.indexOf('export const liveOpenings');
// Not indexOf('[') — that finds the '[' in the `LiveOpening[]` type annotation
// and truncates the declaration. Anchor on the assignment instead.
const arrStart = src.indexOf('= [', startIdx) + 2;
const head = src.slice(0, arrStart + 1);
const body = src.slice(arrStart + 1, src.lastIndexOf(']'));
const tail = src.slice(src.lastIndexOf(']'));

const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));

function field(line, name) {
  const m = line.match(new RegExp(`\\b${name}:'((?:[^'\\\\]|\\\\.)*)'`));
  return m ? m[1] : '';
}
function setField(line, name, value) {
  return line.replace(
    new RegExp(`(\\b${name}:')(?:[^'\\\\]|\\\\.)*(')`),
    (_, a, b) => a + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + b,
  );
}

/* A URL that came out of markdown often carries the fence character or the
   sentence punctuation that followed it. Trailing junk is safe to strip; a real
   posting URL never ends in one of these. */
function cleanUrl(u) {
  let s = u.trim();
  // A URL ends where the markdown fence or the surrounding commentary begins.
  // Cutting at the first illegal character catches the ones that carry a note
  // glued onto the end (…042c`（SF）/), which a trailing-only trim misses.
  s = s.split(/[`'"<>\s（）]|[一-鿿]/)[0];
  s = s.replace(/[\)\]\},;.]+$/, '');
  return s;
}

const CJK = /[一-鿿]/;
const PROSE = /\b(unfortunately|we are not|we do sponsor|not able to sponsor|sponsor visas|please note|as of \d)/i;

/* Why each rule exists is written next to it, because the cheap version of this
   function ("looks weird, drop it") silently deletes real postings with long,
   ugly, but genuine titles. Length alone is never a reason to drop. */
function rejectReason(title, url) {
  const t = title.trim();
  if (!t || t.length < 4) return 'title too short to be a role';
  if (/^["“'\[]/.test(t)) return 'title is a quoted sentence, not a role';
  // "(Mandarin) Sr. Customer Success Manager" is a real posting; a leading
  // parenthetical is only suspicious when it swallows the whole title.
  if (/^\(/.test(t) && !/^\([^)]{1,24}\)\s*\S/.test(t)) return 'title is a parenthetical note, not a role';
  if (/^[^\p{L}\p{N}]/u.test(t)) return 'title starts with an emoji or symbol marker';
  if (CJK.test(t)) return 'title is commentary in Chinese, not a posting title';
  if (PROSE.test(t)) return 'title is prose lifted from a note cell';
  if (/\bJD$/.test(t)) return 'row labels a JD document, not a posting';
  if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(url)) return 'no usable posting URL';
  return null;
}

/* "Scale AI AI Advisory Consultant" for company "Scale AI" is the company name
   glued onto the front by the generator. Strip it, but only when what remains is
   still a plausible title — "Figma" alone must stay "Figma", not become "". */
function dedupeCompanyPrefix(title, company) {
  const c = company.trim();
  if (!c || c.length < 3) return title;
  const re = new RegExp('^' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–—:,]?\\s+', 'i');
  const stripped = title.replace(re, '').trim();
  return stripped.length >= 6 ? stripped : title;
}

const kept = [];
const dropped = [];
const seen = new Map();
let urlsFixed = 0;
let titlesTrimmed = 0;

for (const line of lines) {
  const rawUrl = field(line, 'url');
  const url = cleanUrl(rawUrl);
  const company = field(line, 'company');
  let title = field(line, 'title').trim();

  const reason = rejectReason(title, url);
  if (reason) { dropped.push({ title, url, reason }); continue; }

  const short = dedupeCompanyPrefix(title, company);
  if (short !== title) { titlesTrimmed++; title = short; }
  if (url !== rawUrl) urlsFixed++;

  const key = url.toLowerCase().replace(/\/$/, '');
  if (seen.has(key)) { dropped.push({ title, url, reason: 'duplicate URL of ' + seen.get(key) }); continue; }
  seen.set(key, title);

  let out = setField(line, 'url', url);
  out = setField(out, 'title', title);
  kept.push(out);
}

const report = {
  in: lines.length,
  kept: kept.length,
  dropped: dropped.length,
  urlsFixed,
  titlesTrimmed,
};
console.log(JSON.stringify(report, null, 2));
for (const d of dropped) console.log(`  DROP [${d.reason}] ${d.title.slice(0, 80)}`);

if (!DRY) {
  const rebuilt = head + '\n  ' + kept.join('\n  ') + '\n' + tail;
  writeFileSync(FILE, rebuilt, 'utf8');
  console.log(`\nwrote ${FILE}`);
}
