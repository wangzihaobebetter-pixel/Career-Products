#!/usr/bin/env node
/**
 * reports-to-research.mjs
 *
 * Turns the Chinese-language research reports in "M3 Research Burn" into the
 * research-import JSON that Job Tracker Pro accepts under
 * Settings → Import research JSON.
 *
 * Why a parser and not a hand-written file: the reports are regenerated often,
 * and re-typing 100+ roles by hand is where fake data creeps in. Everything
 * emitted here is traceable to a line in a source file, and anything the
 * parser is not sure about is dropped rather than guessed.
 *
 * Two shapes are recognised, because that is what the reports actually use:
 *
 *   A. role headings   #### #12 · Datadog — AI Research Scientist · New York, NY
 *      followed within a few lines by  "- 链接：https://…"
 *
 *   B. company tables  | **Notion** | People Analytics… | SF | 否 | 未明确 | … |
 *      whose header row names the columns (公司 / 岗位 / 地点 / Remote / Sponsor).
 *
 * Usage:
 *   node tools/reports-to-research.mjs [sourceDir] [outFile]
 *   node tools/reports-to-research.mjs --stats     # counts only, writes nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SRC = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'))
  || path.join(os.homedir(), 'Desktop', 'Open claw', 'M3 Research Burn');
const OUT = process.argv.filter((a, i) => i >= 2 && !a.startsWith('--'))[1]
  || path.join(os.homedir(), 'Desktop', 'Open claw', 'Career Products',
               'research-import-latest.json');
const STATS_ONLY = process.argv.includes('--stats');

/* ------------------------------------------------------------------ */
/* Cleaning                                                            */
/* ------------------------------------------------------------------ */

/** Strip markdown emphasis, footnote marks and stray whitespace. */
const clean = (s) => String(s ?? '')
  .replace(/\*\*/g, '')
  .replace(/`/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](url) -> text
  .replace(/\s+/g, ' ')
  .trim();

/** Chinese reports mark "unknown" a dozen ways; all of them mean "no value". */
const UNKNOWN = /^(未(公开|明确|提及|找到|知|确认|单独)?|不详|待确认|n\/?a|tbd|—|-|无|\?+)$/i;
const val = (s) => { const c = clean(s); return !c || UNKNOWN.test(c) ? undefined : c; };

/**
 * A title has to look like a job title. Report tables also carry prose in the
 * same column ("这一轮没有开放岗位"), and a loose rule would push that prose
 * into the pipeline as a role. Require a known role noun.
 */
const ROLE_WORDS = /(analyst|analytics|scientist|engineer|engineering|manager|associate|specialist|intern|internship|co-?op|program|fellow|residency|rotational|operations|ops|strategy|product|research|consultant|developer|designer|architect|lead|coordinator|new ?grad|early ?career|apprentice|solutions|success|technical|data|business intelligence|bi )/i;

/** Reject obvious non-companies that show up in the company column. */
const NOT_A_COMPANY = /^(公司|company|合计|总计|小计|note|备注|其他|others?|tier ?[0-9]|第[一二三四五六七八九十]|总结|结论)/i;

/**
 * Reports annotate company names inline — "Candid Health (W20)",
 * "Datadog（Boston）", "Postman (API collaboration, 1001+)". Those suffixes are
 * commentary, not part of the name, and they defeat de-duplication against the
 * tracker's existing records. Drop a trailing bracket unless it is doing real
 * disambiguating work (e.g. "Anysphere (Cursor)" — a known alias).
 */
const stripCompanyNotes = (s) => {
  let c = clean(s);
  for (let i = 0; i < 3; i++) {
    const m = c.match(/^(.*?)[（(]([^)）]*)[)）]\s*$/);
    if (!m) break;
    const inner = m[2].trim();
    const isAlias = /^[A-Z][A-Za-z0-9.&' -]{1,24}$/.test(inner)
      && !/^(w|s|f)\d{2}$/i.test(inner)                 // YC batch tags: W20, S21
      && !/boston|remote|nyc|new york|sf|san francisco|hybrid|onsite/i.test(inner);
    if (isAlias) break;
    c = m[1].trim();
  }
  return c.replace(/[,、·]+$/, '').trim();
};

const looksLikeCompany = (s) => {
  const c = stripCompanyNotes(s);
  if (!c || c.length > 60 || NOT_A_COMPANY.test(c)) return false;
  if (/^\d/.test(c)) return false;
  if (/_/.test(c)) return false;                       // "Anastasiia_Borz" — a person
  if (/-style$|类似|之类/.test(c)) return false;        // "Vestwell-style" — a comparison
  // "WHOOP Product Analyst" is a role that leaked into the company column.
  if (/\s(analyst|engineer|manager|scientist|intern|internship|associate|designer|developer|program)s?$/i.test(c)) return false;
  return /[A-Za-z]/.test(c);          // company names in these reports are latin
};

/**
 * Table cells run the role title straight into commentary:
 * "International Tax Operations Manager — Remote US — 软杀（manager level）".
 * Keep the part before the first commentary separator; a title that still looks
 * like prose afterwards is dropped rather than imported half-right.
 */
const trimTitle = (s) => {
  let c = clean(s)
    .split(/\s+[—–]\s+/)[0]                   // prose after an em dash
    .split(/\s*[（(]\s*\$/)[0]                // "(‌$135–180K)" pay annotation
    .split(/\s+\d+\s*份/)[0]                  // "Data Scientist 297 份"
    .replace(/[（(][^)）]*[)）]\s*$/, '')      // "Business Analyst（remote NY）"
    .trim();
  c = c.replace(/[，,、;；:：\\/]\s*$/, '').replace(/\s*\$\S*$/, '').trim();
  return c;
};

const looksLikeTitle = (s) => {
  const c = trimTitle(s);
  if (!c || c.length < 3 || c.length > 90) return false;
  if (/[一-龥]/.test(c)) return false;   // a real title here is English
  if (/\$|\d{4,}/.test(c)) return false;         // pay/count contamination
  return ROLE_WORDS.test(c);
};

/* ------------------------------------------------------------------ */
/* Field normalisation                                                 */
/* ------------------------------------------------------------------ */

const normRemote = (s) => {
  const c = clean(s).toLowerCase();
  if (!c) return undefined;
  if (/remote-?first|全remote|全 remote|us-?remote|remote us|remote-?friendly|^remote|远程/.test(c)) return 'remote';
  if (/hybrid|混合|部分/.test(c)) return 'hybrid';
  if (/onsite|on-?site|in-?person|驻场|否/.test(c)) return 'onsite';
  return undefined;
};

/** "$85,000 - $110,000" / "$85k–$110k" / "$140k" -> {min,max} in dollars. */
const parseSalary = (s) => {
  const c = clean(s);
  if (!c) return {};
  const nums = [...c.matchAll(/\$ ?([0-9][0-9,.]*) ?(k|K)?/g)].map((m) => {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2]) n *= 1000;
    else if (n < 1000) n *= 1000;          // "$85" in a salary column means 85k
    return Math.round(n);
  }).filter((n) => n >= 20000 && n <= 900000);
  if (!nums.length) return {};
  return nums.length === 1 ? { salaryMin: nums[0] } : { salaryMin: Math.min(...nums), salaryMax: Math.max(...nums) };
};

const parseSponsorship = (s) => {
  const c = clean(s);
  if (!c) return undefined;
  if (/明确 ?sponsor|does sponsor|we do sponsor|will sponsor|sponsor visas|明确支持/i.test(c)) return 'sponsors (explicit)';
  if (/不 ?sponsor|no sponsor|do not sponsor|不支持/i.test(c)) return 'does not sponsor';
  if (/lca|h-?1b ?历史|历史|曾经/i.test(c)) return 'H-1B history (inferred)';
  if (UNKNOWN.test(c)) return undefined;
  return c.slice(0, 120);
};

const firstUrl = (s) => (String(s).match(/https?:\/\/[^\s)\]，。、"'<>]+/) || [])[0];

/* ------------------------------------------------------------------ */
/* Shape A — role headings                                             */
/* ------------------------------------------------------------------ */

// #### #12 · Datadog — AI Research Scientist - DAIR · New York, NY
const HEADING = /^#{3,5}\s*#?\d*\s*[·•]\s*(.+?)\s+[—–-]{1,2}\s+(.+?)(?:\s*[·•]\s*(.+))?$/;

function fromHeadings(text, source) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING);
    if (!m) continue;
    if (!looksLikeCompany(m[1]) || !looksLikeTitle(m[2])) continue;
    const company = stripCompanyNotes(m[1]);
    const title = trimTitle(m[2]);

    // The apply link and salary live in the bullet block under the heading.
    const block = lines.slice(i + 1, i + 14).join('\n');
    const stop = block.search(/^#{1,5} /m);
    const body = stop === -1 ? block : block.slice(0, stop);

    out.push({
      company,
      title,
      location: val(m[3]),
      remoteType: normRemote(m[3]) || normRemote(body),
      applyUrl: firstUrl(body),
      ...parseSalary((body.match(/(薪资|salary|pay range|base)[^\n]*/i) || [''])[0]),
      fitReasoning: val((body.match(/^[-*]\s*(?:匹配度|理由|一句话)[：:]\s*(.+)$/m) || [])[1]),
      sourceEvidence: source,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Shape B — company tables                                            */
/* ------------------------------------------------------------------ */

const COL = {
  company: /^(公司|company|企业|名称)/i,
  title: /(岗位|职位|role|title|position|主匹配)/i,
  location: /(地点|地区|location|城市|办公)/i,
  remote: /(remote|远程|办公形式|work ?model)/i,
  sponsor: /(sponsor|签证|h-?1b|visa)/i,
  salary: /(薪资|salary|base|comp|pay)/i,
  why: /(理由|why|说明|备注|解读|评价|reason)/i,
  url: /(链接|url|入口|apply|申请)/i,
};

const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isDivider = (line) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(line.trim()) && line.includes('-');

function fromTables(text, source) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length - 2; i++) {
    if (!lines[i].trim().startsWith('|') || !isDivider(lines[i + 1])) continue;
    const header = splitRow(lines[i]).map(clean);
    const idx = {};
    for (const [key, re] of Object.entries(COL)) {
      const at = header.findIndex((h) => re.test(h));
      if (at !== -1 && idx[key] === undefined) idx[key] = at;
    }
    if (idx.company === undefined) { continue; }

    for (let j = i + 2; j < lines.length; j++) {
      const line = lines[j];
      if (!line.trim().startsWith('|')) break;
      const cells = splitRow(line);
      if (cells.length < 2) continue;
      if (!looksLikeCompany(cells[idx.company] ?? '')) continue;
      const company = stripCompanyNotes(cells[idx.company] ?? '');

      const at = (k) => (idx[k] === undefined ? '' : cells[idx[k]] ?? '');
      const rawTitle = at('title');
      const sponsorship = parseSponsorship(at('sponsor'));
      const why = val(at('why'));

      // One cell often lists several roles: "Analytics Engineer、Data Analyst".
      const titles = clean(rawTitle)
        .split(/[、,;；]|\s+\/\s+/)
        .filter(looksLikeTitle)
        .map(trimTitle);

      if (!titles.length) {
        // Still worth keeping as a company record even with no parsable role.
        out.push({ _companyOnly: true, company, hqLocation: val(at('location')),
                   remotePolicy: normRemote(at('remote')), sponsorshipSignal: sponsorship,
                   whyRelevant: why, sourceEvidence: source });
        continue;
      }
      for (const title of titles.slice(0, 4)) {
        out.push({
          company, title,
          location: val(at('location')),
          remoteType: normRemote(at('remote')),
          applyUrl: firstUrl(at('url')) || firstUrl(line),
          ...parseSalary(at('salary')),
          fitReasoning: why,
          sourceEvidence: sponsorship ? `${source} · sponsorship: ${sponsorship}` : source,
        });
      }
    }
    i++; // header consumed
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Merge + emit                                                        */
/* ------------------------------------------------------------------ */

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function build(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const jobsByKey = new Map();
  const companiesByKey = new Map();
  const perFile = [];

  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const source = f.replace(/\.md$/, '');
    const rows = [...fromHeadings(text, source), ...fromTables(text, source)];
    let jobs = 0;

    for (const r of rows) {
      const ck = norm(r.company);
      if (!ck) continue;
      const prev = companiesByKey.get(ck) || { name: r.company, sourceEvidence: source };
      companiesByKey.set(ck, {
        ...prev,
        hqLocation: prev.hqLocation || r.hqLocation || r.location,
        remotePolicy: prev.remotePolicy || r.remotePolicy || r.remoteType,
        sponsorshipSignal: prev.sponsorshipSignal || r.sponsorshipSignal,
        whyRelevant: prev.whyRelevant || r.whyRelevant || r.fitReasoning,
      });
      if (r._companyOnly) continue;

      const jk = ck + '|' + norm(r.title);
      const cur = jobsByKey.get(jk);
      if (!cur) { jobsByKey.set(jk, r); jobs++; continue; }
      // Prefer the record that carries an apply URL and a salary.
      jobsByKey.set(jk, {
        ...cur,
        applyUrl: cur.applyUrl || r.applyUrl,
        location: cur.location || r.location,
        remoteType: cur.remoteType || r.remoteType,
        salaryMin: cur.salaryMin ?? r.salaryMin,
        salaryMax: cur.salaryMax ?? r.salaryMax,
        fitReasoning: cur.fitReasoning || r.fitReasoning,
      });
    }
    perFile.push({ file: f, rows: rows.length, jobs });
  }

  const jobs = [...jobsByKey.values()].map(({ _companyOnly, ...j }) => j);
  const companies = [...companiesByKey.values()];
  return { jobs, companies, perFile, fileCount: files.length };
}

const { jobs, companies, perFile, fileCount } = build(SRC);
const withUrl = jobs.filter((j) => j.applyUrl).length;
const withSalary = jobs.filter((j) => j.salaryMin).length;

console.log(`source      : ${SRC}`);
console.log(`files read  : ${fileCount}`);
console.log(`companies   : ${companies.length}`);
console.log(`roles       : ${jobs.length}  (${withUrl} with apply URL, ${withSalary} with salary)`);
console.log('\ntop contributing files:');
for (const p of perFile.sort((a, b) => b.jobs - a.jobs).slice(0, 10)) {
  console.log(`  ${String(p.jobs).padStart(4)} roles  ${p.file}`);
}

if (STATS_ONLY) process.exit(0);

const payload = {
  generatedAt: new Date().toISOString(),
  sourceChunk: `M3 Research Burn · ${fileCount} reports`,
  companies, jobs,
};
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`\nwrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
console.log('Import it in the app: Settings → Import research JSON (preview first, nothing commits until you confirm).');
