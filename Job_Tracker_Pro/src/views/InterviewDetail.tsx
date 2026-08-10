import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import { buildPrepChecklist, SCORE_DIMENSIONS, EMPTY_SCORECARD, scorecardAverage } from '../lib/prep';
import type { InterviewEvent } from '../types';

/* ============================================================
   Interview detail — prep before the round, debrief after it.

   Opened from the Interviews list or from a calendar entry. Everything
   here writes straight through to the store, so closing the panel is
   never a way to lose work.
   ============================================================ */

export default function InterviewDetail({ id }: { id: string }) {
  const state = useStore();
  const modal = useModal();
  const iv = state.interviews.find(x => x.id === id);
  const [tab, setTab] = useState<'prep' | 'debrief' | 'logistics'>('prep');
  const [newItem, setNewItem] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  const job = state.jobs.find(j => j.id === iv?.jobId);
  const company = state.companies.find(c => c.id === job?.companyId);

  const bankQuestions = useMemo(() => {
    if (!company?.name) return [];
    const co = company.name.toLowerCase();
    return state.questions.filter(q => q.company && q.company.toLowerCase() === co);
  }, [state.questions, company?.name]);

  if (!iv) return <div className="empty"><div className="e-ico">🔍</div><strong>Interview not found</strong></div>;

  const checklist = iv.prepChecklist || [];
  const doneCount = checklist.filter(c => c.done).length;
  const patch = (p: Partial<InterviewEvent>) => state.updateInterview(id, p);

  const generate = () => {
    const built = buildPrepChecklist(iv, job, company, state.questions);
    /* Never overwrite work: anything already ticked or hand-written
       stays, and only genuinely new lines are appended. */
    const existing = new Set(checklist.map(c => c.text));
    const merged = [...checklist, ...built.filter(b => !existing.has(b.text))];
    patch({ prepChecklist: merged });
    toast(`Prep checklist: ${merged.length - checklist.length} new item${merged.length - checklist.length === 1 ? '' : 's'}`);
  };

  const toggleItem = (i: number) => {
    patch({ prepChecklist: checklist.map((c, n) => n === i ? { ...c, done: !c.done } : c) });
  };
  const removeItem = (i: number) => {
    patch({ prepChecklist: checklist.filter((_, n) => n !== i) });
  };
  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    patch({ prepChecklist: [...checklist, { text: t, done: false }] });
    setNewItem('');
  };

  const scorecard = iv.selfScorecard || EMPTY_SCORECARD;
  const avg = scorecardAverage(iv.selfScorecard);
  const asked = iv.questionsAsked || [];

  const addAsked = () => {
    const t = newQuestion.trim();
    if (!t) return;
    patch({ questionsAsked: [...asked, t] });
    setNewQuestion('');
  };

  /* A question you were actually asked is the most valuable kind. Pushing
     it into the bank tagged with the company is what makes the second
     interview at that company easier than the first. */
  const bankIt = (text: string) => {
    state.addQuestion({
      text,
      type: iv.type === 'behavioral' ? 'behavioral' : iv.type === 'coding' ? 'coding' : 'technical',
      company: company?.name,
      jobId: job?.id,
      notes: `Asked in a real ${iv.type.replace(/_/g, ' ')} on ${iv.scheduledAt.slice(0, 10)}`,
    });
    toast('Saved to the question bank');
  };

  const when = iv.scheduledAt.slice(0, 16).replace('T', ' ');
  const isPast = new Date(iv.scheduledAt) < new Date();

  return (
    <div data-testid="interview-detail">
      <div className="detail-head">
        <div>
          <h3 style={{ margin: 0 }}>{iv.type.replace(/_/g, ' ')}</h3>
          <div className="muted text-sm">
            {company?.name || '—'}{job ? ` · ${job.title}` : ''} · {when}
          </div>
        </div>
        <span className="chip">{iv.outcome.replace(/_/g, ' ')}</span>
      </div>

      <div className="flex mb12" style={{ gap: 4 }}>
        {(['prep', 'debrief', 'logistics'] as const).map(t => (
          <button key={t} className={'btn sm' + (tab === t ? ' primary' : '')} onClick={() => setTab(t)}>
            {t === 'prep' ? `Prep (${doneCount}/${checklist.length})` : t}
          </button>
        ))}
      </div>

      {tab === 'prep' && (
        <div>
          <div className="toolbar">
            <button className="btn" data-testid="generate-prep" onClick={generate}>
              ✨ {checklist.length ? 'Add missing prep items' : 'Generate prep checklist'}
            </button>
            {checklist.length > 0 && (
              <span className="muted text-sm">{doneCount} of {checklist.length} done</span>
            )}
          </div>

          {checklist.length === 0 && (
            <div className="panel">
              <div className="muted text-sm">
                No checklist yet. Generating one builds it from the round type
                ({iv.type.replace(/_/g, ' ')}){company ? `, from what you recorded about ${company.name}` : ''}
                {bankQuestions.length ? `, and from the ${bankQuestions.length} question${bankQuestions.length === 1 ? '' : 's'} in your bank for this company` : ''}.
                Edit or delete anything that does not apply.
              </div>
            </div>
          )}

          {checklist.length > 0 && (
            <div className="panel" data-testid="prep-list">
              {checklist.map((c, i) => (
                <div className="row" key={i}>
                  <input type="checkbox" checked={c.done} onChange={() => toggleItem(i)} />
                  <span className="r-name" style={c.done ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>
                    {c.text}
                  </span>
                  <button className="btn sm ghost" onClick={() => removeItem(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex mt12" style={{ gap: 8 }}>
            <input
              style={{ flex: 1 }}
              placeholder="Add your own prep item"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            />
            <button className="btn" onClick={addItem}>Add</button>
          </div>

          {bankQuestions.length > 0 && (
            <div className="panel mt12">
              <div className="flex-between mb12">
                <b className="text-sm">Question bank — {company?.name}</b>
                <span className="muted text-sm">{bankQuestions.length}</span>
              </div>
              {bankQuestions.slice(0, 8).map(q => (
                <div className="row" key={q.id}>
                  <span className="r-name">{q.text}</span>
                  {q.notes && <span className="r-sub">{q.notes.slice(0, 60)}</span>}
                </div>
              ))}
            </div>
          )}

          <label className="mt12" style={{ display: 'block' }}>
            Prep notes
            <textarea
              rows={5}
              value={iv.prepNotes || ''}
              onChange={e => patch({ prepNotes: e.target.value })}
              placeholder="Your opening line, the numbers you must not forget, the question you will close with."
            />
          </label>
        </div>
      )}

      {tab === 'debrief' && (
        <div>
          {!isPast && (
            <div className="panel mb12">
              <div className="muted text-sm">
                This round has not happened yet. Filling the debrief in advance
                is how a tracker starts lying to you — come back after.
              </div>
            </div>
          )}

          <div className="panel">
            <div className="flex-between mb12">
              <b className="text-sm">Self scorecard</b>
              <span className="muted text-sm" data-testid="scorecard-avg">
                {avg == null ? 'not scored' : `avg ${avg}/5`}
              </span>
            </div>
            {SCORE_DIMENSIONS.map(([key, label]) => (
              <div className="row" key={key}>
                <span className="r-name">{label}</span>
                <div className="flex" style={{ gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={'btn sm' + (scorecard[key] >= n ? ' primary' : '')}
                      data-testid={`score-${key}-${n}`}
                      onClick={() => patch({ selfScorecard: { ...scorecard, [key]: n } })}
                    >{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="panel mt12">
            <div className="flex-between mb12">
              <b className="text-sm">Questions they asked</b>
              <span className="muted text-sm">{asked.length}</span>
            </div>
            {asked.map((q, i) => (
              <div className="row" key={i}>
                <span className="r-name">{q}</span>
                <button className="btn sm" onClick={() => bankIt(q)}>＋ bank</button>
                <button className="btn sm ghost" onClick={() => patch({ questionsAsked: asked.filter((_, n) => n !== i) })}>✕</button>
              </div>
            ))}
            <div className="flex mt12" style={{ gap: 8 }}>
              <input
                style={{ flex: 1 }}
                data-testid="asked-input"
                placeholder="What did they actually ask?"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAsked(); }}
              />
              <button className="btn" data-testid="asked-add" onClick={addAsked}>Add</button>
            </div>
          </div>

          <label className="mt12" style={{ display: 'block' }}>
            What happened
            <textarea
              rows={5}
              value={iv.outcomeNotes || ''}
              onChange={e => patch({ outcomeNotes: e.target.value })}
              placeholder="What went well, what you fumbled, what you would say differently."
            />
          </label>

          <label className="mt12" style={{ display: 'block' }}>
            Outcome
            <select
              value={iv.outcome}
              data-testid="detail-outcome"
              onChange={e => {
                state.logInterviewOutcome(id, e.target.value as InterviewEvent['outcome']);
                toast(e.target.value === 'failed'
                  ? 'Outcome saved — application moved to Rejected'
                  : 'Outcome saved');
              }}>
              {(['pending', 'passed', 'failed', 'no_show', 'rescheduled', 'canceled'] as const).map(o =>
                <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
        </div>
      )}

      {tab === 'logistics' && (
        <div className="form">
          <label>Interviewer<input value={iv.interviewerName || ''} onChange={e => patch({ interviewerName: e.target.value })} placeholder="Name" /></label>
          <label>Their title<input value={iv.interviewerTitle || ''} onChange={e => patch({ interviewerTitle: e.target.value })} placeholder="e.g. Senior Data Scientist" /></label>
          <label>Their LinkedIn<input value={iv.interviewerLinkedIn || ''} onChange={e => patch({ interviewerLinkedIn: e.target.value })} placeholder="https://…" /></label>
          <label>Meeting link<input value={iv.meetingLink || ''} onChange={e => patch({ meetingLink: e.target.value })} placeholder="Zoom / Meet / phone" /></label>
          <div className="flex" style={{ gap: 8 }}>
            <label style={{ flex: 1 }}>Date<input type="date" value={iv.scheduledAt.slice(0, 10)}
              onChange={e => patch({ scheduledAt: e.target.value + 'T' + iv.scheduledAt.slice(11, 16) + ':00' })} /></label>
            <label style={{ flex: 1 }}>Time<input type="time" value={iv.scheduledAt.slice(11, 16)}
              onChange={e => patch({ scheduledAt: iv.scheduledAt.slice(0, 10) + 'T' + e.target.value + ':00' })} /></label>
          </div>
          <label>Duration (min)<input type="number" value={iv.durationMin ?? 60}
            onChange={e => patch({ durationMin: Number(e.target.value) || undefined })} /></label>
          <label>Agenda<textarea rows={3} value={iv.agenda || ''} onChange={e => patch({ agenda: e.target.value })}
            placeholder="Rounds, names, order — paste what the recruiter sent." /></label>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={() => { state.removeInterview(id); modal.close(); toast('Interview removed'); }}>Delete</button>
        <button className="btn primary" onClick={() => modal.close()}>Done</button>
      </div>
    </div>
  );
}
