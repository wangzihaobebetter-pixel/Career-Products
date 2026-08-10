import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { toast } from '../components/Toast';
import { matchBullets, type Keyword, type BulletMatch } from '../lib/match';

/* ============================================================
   Tailor — paste a JD, see what your bullet library already
   covers, what it does not, and assemble a tailored resume
   section from the bullets that actually earn their place.

   This is the one screen that turns the research corpus into a
   document. Everything here is derived from `lib/match.ts`; no
   text is invented, bullets are only ever *selected*, never
   rewritten by the app.
   ============================================================ */

/* Greedy set-cover: repeatedly take the bullet that adds the most
   still-uncovered keywords. Ties break toward the higher raw score.
   Plain "top N by score" picks near-duplicates; this does not. */
function autoSelect(bullets: BulletMatch[], limit: number): string[] {
  const covered = new Set<string>();
  const picked: string[] = [];
  const pool = bullets.slice();
  while (picked.length < limit && pool.length) {
    let bestIdx = -1, bestGain = -1, bestScore = -1;
    pool.forEach((b, i) => {
      const gain = b.hits.filter(h => !covered.has(h)).length;
      if (gain > bestGain || (gain === bestGain && b.score > bestScore)) {
        bestIdx = i; bestGain = gain; bestScore = b.score;
      }
    });
    if (bestIdx < 0 || bestGain <= 0) break;   // nothing new left to cover
    const b = pool.splice(bestIdx, 1)[0];
    b.hits.forEach(h => covered.add(h));
    picked.push(b.bulletId);
  }
  return picked;
}

function KeywordChip({ k, on }: { k: Keyword; on: boolean }) {
  return (
    <span
      className="chip"
      title={`${k.isSkill ? 'skill' : 'keyword'} · appears ${k.count}× · weight ${k.weight}`}
      style={{
        borderColor: on ? 'var(--ok, #34d399)' : 'var(--danger, #ef4444)',
        color: on ? 'var(--ok, #34d399)' : 'var(--danger, #ef4444)',
        opacity: k.weight >= 3 ? 1 : k.weight === 2 ? 0.85 : 0.6,
        fontWeight: k.weight >= 3 ? 700 : 500,
      }}
    >
      {on ? '✓' : '✗'} {k.term}{k.weight >= 3 ? ' *' : ''}
    </span>
  );
}

export default function Tailor() {
  const state = useStore();
  const [jd, setJd] = useState('');
  const [jobId, setJobId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);   // has the user hand-picked?
  const [limit, setLimit] = useState(6);

  const report = useMemo(
    () => matchBullets(jd, state.bullets.map(b => ({ id: b.id, text: b.text }))),
    [jd, state.bullets],
  );

  /* Auto-selection is a starting point, not a lock: the moment the
     user toggles anything we stop overwriting their choice. */
  const effectiveSelection = useMemo(
    () => (touched ? selected : autoSelect(report.bullets, limit)),
    [touched, selected, report.bullets, limit],
  );

  const toggle = (id: string) => {
    const base = effectiveSelection;
    setTouched(true);
    setSelected(base.includes(id) ? base.filter(x => x !== id) : [...base, id]);
  };

  const loadFromJob = (id: string) => {
    setJobId(id);
    const job = state.jobs.find(j => j.id === id);
    if (!job) return;
    if (job.description && job.description.trim()) {
      setJd(job.description);
      setTouched(false);
      toast('Loaded saved JD from this job');
    } else {
      toast('That job has no JD saved yet — paste it and hit Save to job');
    }
  };

  const outputText = useMemo(() => {
    const chosen = effectiveSelection
      .map(id => state.bullets.find(b => b.id === id))
      .filter((b): b is NonNullable<typeof b> => !!b);
    return chosen.map(b => `• ${b.text}`).join('\n');
  }, [effectiveSelection, state.bullets]);

  /* Coverage of the *selected* set, not the whole library — this is
     the number that describes the document you are about to send. */
  const selectedCoverage = useMemo(() => {
    const skills = report.keywords.filter(k => k.isSkill);
    if (!skills.length) return 0;
    const covered = new Set(
      report.bullets.filter(b => effectiveSelection.includes(b.bulletId)).flatMap(b => b.hits),
    );
    const total = skills.reduce((s, k) => s + k.weight, 0);
    const got = skills.filter(k => covered.has(k.term)).reduce((s, k) => s + k.weight, 0);
    return Math.round((got / total) * 100);
  }, [report, effectiveSelection]);

  const saveToJob = () => {
    if (!jobId) { toast('Pick a job first'); return; }
    state.updateJob(jobId, {
      description: jd,
      jdKeywords: report.keywords.filter(k => k.isSkill).map(k => k.term),
    });
    toast('JD + keywords saved to that job');
  };

  const saveVersion = () => {
    if (!effectiveSelection.length) { toast('Nothing selected'); return; }
    const job = state.jobs.find(j => j.id === jobId);
    const co = job && state.companies.find(c => c.id === job.companyId);
    state.addResume({
      label: job ? `${co?.name || 'Untitled'} — ${job.title}` : `Tailored ${new Date().toISOString().slice(0, 10)}`,
      type: 'tailored',
      targetJobId: jobId || undefined,
      bulletsUsed: effectiveSelection,
      jdKeywordsMatched: report.matched.filter(k => k.isSkill).map(k => k.term),
      matchScore: selectedCoverage,
      notes: outputText,
    });
    toast('Saved as a resume version');
  };

  const download = () => {
    const job = state.jobs.find(j => j.id === jobId);
    const co = job && state.companies.find(c => c.id === job.companyId);
    const header = job ? `Tailored bullets — ${co?.name || ''} / ${job.title}\n\n` : 'Tailored bullets\n\n';
    const gaps = report.missing.length
      ? `\n\nNot covered by any bullet (address in cover letter or leave alone):\n${report.missing.map(k => '- ' + k.term).join('\n')}`
      : '';
    const blob = new Blob([header + outputText + gaps], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tailored-bullets-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    toast('Downloaded');
  };

  const hasJd = jd.trim().length > 40;

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {/* ---------- left: input + gaps ---------- */}
      <div>
        <div className="panel">
          <div className="panel-head">
            <h3>Job Description</h3>
            <select
              className="filter"
              value={jobId}
              onChange={e => loadFromJob(e.target.value)}
              style={{ maxWidth: 260 }}
            >
              <option value="">— pick a job from pipeline —</option>
              {state.jobs.map(j => {
                const co = state.companies.find(c => c.id === j.companyId);
                return <option key={j.id} value={j.id}>{co?.name || ''} — {j.title}</option>;
              })}
            </select>
          </div>
          <textarea
            className="search"
            style={{ width: '100%', minHeight: 220, fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.55, resize: 'vertical' }}
            placeholder={'Paste the full job description here.\n\nThe requirements / qualifications block is weighted higher than the rest — paste it in, do not summarize it.'}
            value={jd}
            onChange={e => { setJd(e.target.value); setTouched(false); }}
          />
          <div className="flex" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={saveToJob} disabled={!jobId || !hasJd}>💾 Save JD to job</button>
            <button className="btn ghost" onClick={() => { setJd(''); setTouched(false); setSelected([]); }}>Clear</button>
            <span className="muted2 text-sm" style={{ marginLeft: 'auto' }}>{jd.length.toLocaleString()} chars</span>
          </div>
        </div>

        {hasJd && (
          <>
            <div className="panel mt12">
              <div className="panel-head">
                <h3>Keyword Coverage</h3>
                <span className="chip" style={{ fontWeight: 700 }}>
                  library {report.coverage}% · selected {selectedCoverage}%
                </span>
              </div>
              <div className="muted2 text-sm mb12">
                Weighted over skill keywords only. <b>*</b> marks terms found inside the
                requirements block — those are what a screener filters on. Generic words are
                excluded from the score on purpose; covering them proves nothing.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {report.keywords.filter(k => k.isSkill).map(k => (
                  <KeywordChip key={k.term} k={k} on={report.matched.some(m => m.term === k.term)} />
                ))}
                {report.keywords.filter(k => k.isSkill).length === 0 &&
                  <div className="muted text-sm">No known skill terms detected in this JD.</div>}
              </div>
            </div>

            <div className="panel mt12">
              <div className="panel-head"><h3>Gaps ({report.missing.length})</h3></div>
              <div className="muted2 text-sm mb12">
                Nothing in your bullet library covers these. That is information, not a verdict —
                some gaps you close with a new bullet, some you address in the cover letter, and
                some are simply a signal that this role is not the right target.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {report.missing.map(k => <KeywordChip key={k.term} k={k} on={false} />)}
                {report.missing.length === 0 && <div className="muted text-sm">No skill gaps — your library covers every skill term in this JD.</div>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- right: bullets + output ---------- */}
      <div>
        <div className="panel">
          <div className="panel-head">
            <h3>Ranked Bullets ({report.bullets.length})</h3>
            <div className="flex" style={{ gap: 5 }}>
              <select className="filter" value={limit} onChange={e => { setLimit(Number(e.target.value)); setTouched(false); }}>
                {[4, 5, 6, 8, 10].map(n => <option key={n} value={n}>auto-pick {n}</option>)}
              </select>
              <button className="btn sm" onClick={() => { setTouched(false); setSelected([]); }}>Re-auto</button>
            </div>
          </div>
          {!hasJd && (
            <div className="empty">
              <div className="e-ico">🎯</div><strong>Paste a JD to start</strong>
              <p>Your {state.bullets.length} bullets get ranked against it, and the auto-picker
                chooses the smallest set that covers the most required skills.</p>
            </div>
          )}
          {hasJd && report.bullets.length === 0 && (
            <div className="empty">
              <div className="e-ico">🔍</div><strong>No bullet matched</strong>
              <p>Not one of your bullets shares a keyword with this JD. Either the JD is in an
                unusual format, or this role is genuinely far from your current evidence.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '46vh', overflowY: 'auto' }}>
            {report.bullets.map(b => {
              const on = effectiveSelection.includes(b.bulletId);
              return (
                <div key={b.bulletId}
                  onClick={() => toggle(b.bulletId)}
                  style={{
                    display: 'flex', gap: 9, cursor: 'pointer',
                    background: on ? 'var(--panel2)' : 'transparent',
                    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                    borderRadius: 8, padding: '9px 11px', fontSize: 12.5, alignItems: 'flex-start',
                  }}>
                  <input type="checkbox" checked={on} readOnly style={{ marginTop: 3 }} />
                  <div style={{ flex: 1 }}>
                    <div>{b.text}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {b.hits.slice(0, 10).map(h => <span key={h} className="chip" style={{ fontSize: 10.5 }}>{h}</span>)}
                    </div>
                  </div>
                  <span className="chip" title="sum of matched keyword weights">{b.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel mt12">
          <div className="panel-head">
            <h3>Output ({effectiveSelection.length} bullets)</h3>
            <div className="flex" style={{ gap: 5 }}>
              <button className="btn sm" onClick={() => { navigator.clipboard.writeText(outputText); toast('Copied'); }} disabled={!outputText}>⧉ Copy</button>
              <button className="btn sm" onClick={download} disabled={!outputText}>⬇ .txt</button>
              <button className="btn sm primary" onClick={saveVersion} disabled={!outputText}>Save version</button>
            </div>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.65,
            background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '11px 13px', margin: 0, minHeight: 90,
          }}>{outputText || '(nothing selected yet)'}</pre>
          <div className="muted2 text-sm mt12">
            These are your own bullets, selected — not rewritten. The app will never generate
            resume claims for you, because a claim you cannot defend in the interview is worse
            than a gap.
          </div>
        </div>

        {state.resumes.filter(r => r.type === 'tailored').length > 0 && (
          <div className="panel mt12">
            <div className="panel-head"><h3>Saved tailored versions</h3></div>
            {state.resumes.filter(r => r.type === 'tailored').map(r => (
              <div className="row" key={r.id}>
                <span className="r-name">{r.label}</span>
                {r.matchScore != null && <span className="chip">match {r.matchScore}%</span>}
                <span className="r-sub">{r.bulletsUsed?.length || 0} bullets</span>
                <span className="r-date">{r.createdAt.slice(0, 10)}</span>
                <button className="btn sm ghost" onClick={() => { state.removeResume(r.id); toast('Removed'); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
