import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { liveOpenings, liveOpeningsCheckedAt, type LiveOpening } from '../data/liveOpenings';
import type { Level, RemoteType, Source } from '../types';

/* The research passes produced ~9 MB of markdown. Buried in it were real
   postings with real URLs. This view is the only place those become
   actionable: filter them, then push one into the pipeline as a real job.

   Two things this view refuses to do:
   1. Claim a role is open. `verify:'reachable'` means the URL answered 200
      when it was checked — boards keep filled postings live for weeks.
   2. Hide where a row came from. Every card names the report file it was
      lifted out of, so any claim can be traced back and re-read. */

const LEVEL_MAP: { test: RegExp; level: Level }[] = [
  { test: /principal/i, level: 'principal' },
  { test: /staff/i, level: 'staff' },
  { test: /senior|sr\.?\s/i, level: 'senior' },
  { test: /manager|head of|director/i, level: 'manager' },
  { test: /junior|entry|associate|intern|new ?grad|analyst i\b|apm/i, level: 'entry' },
  { test: /mid/i, level: 'mid' },
];

function guessLevel(o: LiveOpening): Level | undefined {
  const hay = `${o.level} ${o.title}`;
  for (const m of LEVEL_MAP) if (m.test.test(hay)) return m.level;
  return undefined;
}

function guessRemote(o: LiveOpening): RemoteType {
  const hay = `${o.location} ${o.tags}`.toLowerCase();
  if (/\bremote\b/.test(hay)) return 'remote';
  if (/hybrid/.test(hay)) return 'hybrid';
  if (/onsite|in.person|in office/.test(hay)) return 'onsite';
  return 'onsite';
}

function guessSource(url: string): Source {
  if (/builtin/i.test(url)) return 'builtin';
  if (/wellfound|workatastartup/i.test(url)) return 'wellfound';
  if (/linkedin/i.test(url)) return 'linkedin';
  return 'company_site';
}

/* "64K-80K Annually", "$141k-$177k", "$60K–$80K" → [64000, 80000].
   Anything it cannot read confidently returns nulls rather than a guess —
   a wrong salary in the pipeline poisons the Stats median. */
export function parseSalary(raw: string): [number | null, number | null] {
  if (!raw) return [null, null];
  const nums = raw.match(/\$?\s*(\d[\d.,]*)\s*([Kk])?/g);
  if (!nums || nums.length === 0) return [null, null];
  const vals = nums.map(n => {
    const m = n.match(/(\d[\d.,]*)\s*([Kk])?/);
    if (!m) return null;
    let v = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(v)) return null;
    if (m[2]) v *= 1000;
    else if (v < 1000) return null;      // bare "3" from "3 locations" is not a salary
    return Math.round(v);
  }).filter((v): v is number => v !== null && v >= 20000 && v <= 900000);
  if (vals.length === 0) return [null, null];
  if (vals.length === 1) return [vals[0], null];
  return [Math.min(...vals), Math.max(...vals)];
}

const VERIFY_COPY: Record<string, { label: string; color: string; help: string }> = {
  reachable: {
    label: 'URL answered 200',
    color: 'var(--good)',
    help: `Checked ${liveOpeningsCheckedAt}. The page loaded — that is not proof the role is still open. Re-read it before applying.`,
  },
  blocked: {
    label: 'Host blocked the check',
    color: 'var(--warn)',
    help: 'Built In Boston returns 429 to non-browser clients, so this URL could not be checked automatically. Unknown, not dead — open it yourself.',
  },
};

export default function Openings() {
  const state = useStore();
  const [q, setQ] = useState('');
  const [verify, setVerify] = useState<'all' | 'reachable' | 'blocked'>('all');
  const [level, setLevel] = useState<'all' | Level>('all');
  const [payOnly, setPayOnly] = useState(false);
  const [hideImported, setHideImported] = useState(false);
  const [srcFile, setSrcFile] = useState('all');
  const [limit, setLimit] = useState(60);

  const importedUrls = useMemo(
    () => new Set(state.jobs.map(j => j.sourceUrl).filter(Boolean) as string[]),
    [state.jobs],
  );

  const sourceFiles = useMemo(
    () => Array.from(new Set(liveOpenings.map(o => o.source))).sort(),
    [],
  );

  const rows = useMemo(() => {
    const t = q.toLowerCase().trim();
    return liveOpenings.filter(o => {
      if (verify !== 'all' && o.verify !== verify) return false;
      if (srcFile !== 'all' && o.source !== srcFile) return false;
      if (level !== 'all' && guessLevel(o) !== level) return false;
      if (payOnly && !parseSalary(o.salary)[0]) return false;
      if (hideImported && importedUrls.has(o.url)) return false;
      if (!t) return true;
      return `${o.company} ${o.title} ${o.location} ${o.tags} ${o.note}`.toLowerCase().includes(t);
    });
  }, [q, verify, level, payOnly, hideImported, srcFile, importedUrls]);

  function importOne(o: LiveOpening) {
    let company = state.companies.find(
      c => c.name.toLowerCase().trim() === o.company.toLowerCase().trim(),
    );
    let companyId = company?.id;
    if (!companyId) {
      companyId = state.addCompany({ name: o.company, followStatus: 'following', notes: `Added from ${o.source}` });
    }
    const [lo, hi] = parseSalary(o.salary);
    state.addJob({
      title: o.title,
      companyId,
      sourceUrl: o.url,
      source: guessSource(o.url),
      location: o.location || undefined,
      remoteType: guessRemote(o),
      level: guessLevel(o),
      salaryMin: lo ?? undefined,
      salaryMax: hi ?? undefined,
      salaryCurrency: lo ? 'USD' : undefined,
      tags: o.tags ? o.tags.split(/[,、]/).map(s => s.trim()).filter(Boolean) : undefined,
      status: 'wishlist',
      priority: 'medium',
      description: o.note || undefined,
    });
  }

  function importAllVisible() {
    const todo = rows.filter(o => !importedUrls.has(o.url));
    todo.forEach(importOne);
  }

  const reachableCount = rows.filter(r => r.verify === 'reachable').length;
  const newCount = rows.filter(r => !importedUrls.has(r.url)).length;

  return (
    <div className="view openings">
      <div className="panel prov">
        <b>{liveOpenings.length} postings</b> pulled out of {sourceFiles.length} research
        reports. Each one is a row that existed in a report file — none were written by hand.
        Link status was checked on <b>{liveOpeningsCheckedAt}</b>:{' '}
        <b>{liveOpenings.filter(o => o.verify === 'reachable').length}</b> answered 200,{' '}
        <b>{liveOpenings.filter(o => o.verify === 'blocked').length}</b> sit on a host that
        blocks automated checks. Dead links (404) were dropped. A reachable URL is not a
        promise the role is open — always re-read the posting.
      </div>

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search title, company, location, tag…"
          value={q}
          onChange={e => { setQ(e.target.value); setLimit(60); }}
        />
        <select value={verify} onChange={e => setVerify(e.target.value as any)}>
          <option value="all">Any link status</option>
          <option value="reachable">Answered 200</option>
          <option value="blocked">Unchecked (host blocked)</option>
        </select>
        <select value={level} onChange={e => setLevel(e.target.value as any)}>
          <option value="all">Any level</option>
          <option value="entry">Entry / associate</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="principal">Principal</option>
          <option value="manager">Manager+</option>
        </select>
        <select value={srcFile} onChange={e => setSrcFile(e.target.value)}>
          <option value="all">Any report</option>
          {sourceFiles.map(f => <option key={f} value={f}>{f.replace(/_2026-08-\d\d\.md$/, '')}</option>)}
        </select>
        <label className="chk"><input type="checkbox" checked={payOnly} onChange={e => setPayOnly(e.target.checked)} /> Pay listed</label>
        <label className="chk"><input type="checkbox" checked={hideImported} onChange={e => setHideImported(e.target.checked)} /> Hide imported</label>
      </div>

      <div className="toolbar">
        <span className="count">
          {rows.length} match · {reachableCount} answered 200 · {newCount} not yet in pipeline
        </span>
        <button className="primary" disabled={newCount === 0} onClick={importAllVisible}>
          Add {newCount} to pipeline
        </button>
      </div>

      <div className="cards">
        {rows.slice(0, limit).map(o => {
          const [lo, hi] = parseSalary(o.salary);
          const already = importedUrls.has(o.url);
          const v = VERIFY_COPY[o.verify];
          return (
            <div className={'card opening' + (already ? ' done' : '')} key={o.id}>
              <div className="row1">
                <b className="t">{o.title}</b>
                <span className="co">{o.company}</span>
              </div>
              <div className="meta">
                {o.location && <span>{o.location}</span>}
                {lo && <span className="pay">${(lo / 1000).toFixed(0)}K{hi ? `–$${(hi / 1000).toFixed(0)}K` : ''}</span>}
                {guessLevel(o) && <span className="lvl">{guessLevel(o)}</span>}
                {o.tags && <span className="tags">{o.tags}</span>}
              </div>
              {o.note && <p className="note">{o.note}</p>}
              <div className="foot">
                <span className="badge" style={{ color: v.color, borderColor: v.color }} title={v.help}>
                  {v.label}
                </span>
                <span className="src" title="The report file this row was lifted from">{o.source}</span>
                <a href={o.url} target="_blank" rel="noreferrer">Open posting ↗</a>
                {already
                  ? <span className="in">In pipeline</span>
                  : <button onClick={() => importOne(o)}>Add to pipeline</button>}
              </div>
            </div>
          );
        })}
      </div>

      {rows.length > limit && (
        <div className="toolbar">
          <button onClick={() => setLimit(l => l + 60)}>
            Show 60 more ({rows.length - limit} left)
          </button>
        </div>
      )}
      {rows.length === 0 && <div className="empty">No posting matches those filters.</div>}
    </div>
  );
}
