import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import { computeFollowUps } from '../lib/followups';
import { goalProgress, METRIC_LABEL } from '../lib/goals';
import { visaMilestones } from '../seed4';
import type { JobApplication, Task } from '../types';

const DAY = 86_400_000;
const CLOSED = ['rejected', 'ghosted', 'withdrawn', 'accepted'];
const IN_FLIGHT = ['applied', 'phone_screen', 'technical', 'onsite', 'final', 'offer', 'negotiating'];

function daysInStage(j: JobApplication): number {
  const last = j.stageHistory[j.stageHistory.length - 1];
  if (!last) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(last.at).getTime()) / DAY));
}

/* The funnel bar width must always carry a unit. Returning a bare number
   makes React fall back to px, which silently renders a 96%-wide bar as
   96 pixels — visible only as a stub. Always build the string. */
function barWidth(count: number, total: number): string {
  if (!count) return '0%';
  return Math.max(6, (count / Math.max(1, total)) * 100) + '%';
}

/* Milestone windows are authored as 'YYYY-MM' or 'YYYY-MM-DD', sometimes
   with a trailing note like '2026-08 (now)'. Parse leniently, and treat an
   unparseable window as far-future so it never jumps the queue. */
function milestoneDate(window: string): number {
  const m = window.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] || '1')).getTime();
}

function QuickTaskForm({ onDone }: { onDone: () => void }) {
  const state = useStore();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    state.addTask({ title: title.trim(), dueDate: due, priority, type: 'custom' });
    onDone();
  };
  return (
    <form onSubmit={submit}>
      <h3>New Task</h3>
      <label>Title
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Follow up with Klaviyo recruiter" />
      </label>
      <div className="grid grid-2">
        <label>Due
          <input type="date" value={due} onChange={e => setDue(e.target.value)} />
        </label>
        <label>Priority
          <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn">Add task</button>
      </div>
    </form>
  );
}

export default function Dashboard({ onOpenJob, onOpenCompany, onNavigate }: {
  onOpenJob: (id: string) => void;
  onOpenCompany: (id: string) => void;
  onNavigate?: (view: string) => void;
}) {
  const state = useStore();
  const s = state;
  const modal = useModal();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const active = s.jobs.filter(j => !CLOSED.includes(j.status));
  const applied = s.jobs.filter(j => IN_FLIGHT.includes(j.status));

  /* "Upcoming interviews" is advertised as next 7 days, so filter on that
     window rather than on all future events. */
  const weekAhead = Date.now() + 7 * DAY;
  const interviews = s.interviews
    .filter(i => {
      const t = new Date(i.scheduledAt).getTime();
      return t >= Date.now() && t <= weekAhead;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const offers = s.jobs.filter(j => ['offer', 'negotiating', 'accepted'].includes(j.status));
  const todayStr = new Date().toISOString().slice(0, 10);
  const tasksToday = s.tasks.filter(t => t.status !== 'done' && (!t.dueDate || t.dueDate <= todayStr));
  const tasksOverdue = tasksToday.filter(t => t.dueDate && t.dueDate < todayStr);
  const openTasks = s.tasks.filter(t => t.status !== 'done');
  const stuck = active.filter(j => daysInStage(j) > 14);
  const pipelineValue = offers.reduce((sum, o) => sum + (o.salaryMin || 0), 0);

  const funnel = useMemo(() => {
    const stages = s.stages.filter(st => !CLOSED.includes(st.id as string));
    return stages.map(st => ({ ...st, count: s.jobs.filter(j => j.status === st.id).length }));
  }, [s.jobs, s.stages]);

  /* Derived nudges, recomputed every render so they cannot go stale. */
  const suggestions = useMemo(() => computeFollowUps({
    jobs: s.jobs,
    contacts: s.contacts,
    interviews: s.interviews,
    tasks: s.tasks,
    companyName: (cid) => s.companies.find(c => c.id === cid)?.name || '—',
  }).filter(x => !dismissed.includes(x.id)), [s.jobs, s.contacts, s.interviews, s.tasks, s.companies, dismissed]);

  const nextMilestones = useMemo(() => {
    const now = Date.now();
    return visaMilestones
      .map(m => ({ ...m, ts: milestoneDate(m.window) }))
      .sort((a, b) => a.ts - b.ts)
      .filter(m => m.ts >= now - 31 * DAY)
      .slice(0, 3);
  }, []);

  /* Weekly targets, with progress counted from real records (never stored). */
  const weeklyGoals = useMemo(() => s.goals
    .filter(g => g.period === 'week')
    .slice(0, 4)
    .map(g => ({
      ...g,
      current: goalProgress(g.metric, g.startDate, g.endDate, {
        jobs: s.jobs, interviews: s.interviews, offers: s.offers, contacts: s.contacts, tasks: s.tasks,
      }),
    })),
    [s.goals, s.jobs, s.interviews, s.offers, s.contacts, s.tasks]);

  const openTaskModal = () => {
    modal.open(<QuickTaskForm onDone={() => { modal.close(); toast('Task added'); }} />);
  };

  const SUG_TONE: Record<string, string> = { overdue: 'var(--bad)', today: 'var(--warn)', soon: 'var(--muted2)' };

  const go = (view: string) => { if (onNavigate) onNavigate(view); };

  return (
    <div>
      {/* KPI row */}
      <div className="kpi-row">
        <div className="kpi"><div className="k-num">{active.length}</div><div className="k-lbl">Active applications</div><div className="k-sub">{applied.length} applied+</div></div>
        <div className="kpi"><div className="k-num">{interviews.length}</div><div className="k-lbl">Upcoming interviews</div><div className="k-sub">next 7 days</div></div>
        <div className="kpi"><div className="k-num">{offers.length}</div><div className="k-lbl">Open offers</div><div className="k-sub">${pipelineValue >= 1000 ? Math.round(pipelineValue / 1000) + 'k' : pipelineValue} pipeline</div></div>
        <div className="kpi"><div className="k-num">{tasksToday.length}</div><div className="k-lbl">Tasks due</div><div className="k-sub">{tasksOverdue.length} overdue · {stuck.length} stuck</div></div>
        <div className="kpi"><div className="k-num">{suggestions.length}</div><div className="k-lbl">Suggested follow-ups</div><div className="k-sub">{suggestions.filter(x => x.urgency === 'overdue').length} overdue</div></div>
        <div className="kpi"><div className="k-num">{s.companies.length}</div><div className="k-lbl">Target companies</div><div className="k-sub">{s.contacts.length} contacts</div></div>
      </div>

      <div className="grid grid-2">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Needs follow-up — derived from pipeline state, not stored */}
          <div className="panel">
            <div className="panel-head">
              <h3>Needs Follow-Up</h3>
              <button className="btn sm ghost" onClick={() => go('actions')}>Action board →</button>
            </div>
            {suggestions.length === 0 && (
              <div className="empty"><div className="e-ico">✅</div><strong>Nothing overdue</strong><p>No application or contact has gone quiet past its cadence.</p></div>
            )}
            {suggestions.slice(0, 6).map(sg => (
              <div className="row" key={sg.id}>
                <span style={{ color: SUG_TONE[sg.urgency] || 'var(--muted2)', fontSize: 11, minWidth: 52, textTransform: 'uppercase' }}>{sg.urgency}</span>
                <span className="r-name" title={sg.why}>
                  {sg.title}
                  <span className="r-sub"> · {sg.why}</span>
                </span>
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    s.addTask({ title: sg.title, type: sg.suggestedTaskType, dueDate: todayStr, priority: sg.urgency === 'overdue' ? 'high' : 'medium', jobId: sg.jobId, contactId: sg.contactId });
                    setDismissed(d => [...d, sg.id]);
                    toast('Added to Action Board');
                  }}
                >＋ Task</button>
                <button className="btn sm ghost" title="Dismiss" onClick={() => setDismissed(d => [...d, sg.id])}>✕</button>
              </div>
            ))}
          </div>

          {/* Today's tasks — wired to the real store action */}
          <div className="panel">
            <div className="panel-head">
              <h3>Tasks Due</h3>
              <button className="btn sm ghost" onClick={openTaskModal}>＋ Add</button>
            </div>
            {tasksToday.length === 0 && (
              <div className="empty"><div className="e-ico">🎉</div><strong>All clear</strong><p>{openTasks.length} open task{openTasks.length === 1 ? '' : 's'} scheduled later. Time to send cold outreach?</p></div>
            )}
            {tasksToday.slice(0, 8).map(t => (
              <div className="row" key={t.id}>
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={() => s.toggleTask(t.id)}
                  style={{ width: 15, height: 15 }}
                />
                <span className="r-name" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? 0.55 : 1 }}>{t.title}</span>
                {t.priority === 'urgent' && <span style={{ color: 'var(--bad)' }}>🔴</span>}
                {t.priority === 'high' && <span style={{ color: 'var(--warn)' }}>⚠️</span>}
                {t.dueDate && <span className="r-date" style={{ color: t.dueDate < todayStr ? 'var(--bad)' : undefined }}>{t.dueDate.slice(5)}</span>}
              </div>
            ))}
          </div>

          {/* Upcoming interviews */}
          <div className="panel">
            <div className="panel-head">
              <h3>Upcoming Interviews</h3>
              <button className="btn sm ghost" onClick={() => go('interviews')}>Calendar →</button>
            </div>
            {interviews.length === 0 && (
              <div className="empty"><div className="e-ico">🎤</div><strong>No interviews in the next 7 days</strong><p>Your pipeline is early-stage — keep applying.</p></div>
            )}
            {interviews.map(iv => {
              const job = s.jobs.find(j => j.id === iv.jobId);
              const co = s.companies.find(c => c.id === job?.companyId);
              return (
                <div className="row clickable" key={iv.id} onClick={() => job && onOpenJob(job.id)}>
                  <span style={{ color: 'var(--accent)' }}>📅</span>
                  <span className="r-name">{iv.type.replace(/_/g, ' ')} <span className="r-sub">· {co?.name || ''}</span></span>
                  <span className="r-date">{iv.scheduledAt.slice(5, 16).replace('T', ' ')}</span>
                </div>
              );
            })}
          </div>

          {/* Recent activity */}
          <div className="panel">
            <div className="panel-head"><h3>Recent Activity</h3></div>
            {s.activity.length === 0 && <div className="empty"><div className="e-ico">🕓</div><strong>No activity yet</strong><p>Moving a job or logging an outcome will show up here.</p></div>}
            {s.activity.slice(0, 8).map(a => (
              <div className="row" key={a.id}>
                <span style={{ fontSize: 11, color: 'var(--muted2)', minWidth: 56 }}>{a.at.slice(5, 16).replace('T', ' ')}</span>
                <span className="r-name">{a.summary}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Pipeline snapshot */}
          <div className="panel">
            <div className="panel-head">
              <h3>Pipeline Snapshot</h3>
              <button className="btn sm ghost" onClick={() => go('pipeline')}>View board →</button>
            </div>
            <div className="funnel">
              {funnel.map(st => (
                <div className="funnel-row" key={st.id}>
                  <span className="f-label">{st.label}</span>
                  <div className="f-bar"><div className="f-fill" style={{ width: barWidth(st.count, s.jobs.length), background: st.color }} /></div>
                  <span className="f-num">{st.count}</span>
                </div>
              ))}
            </div>
            {stuck.length > 0 && <div className="mt8 text-sm" style={{ color: 'var(--warn)' }}>⚠️ {stuck.length} applications stuck &gt;14 days — consider follow-up</div>}
          </div>

          {/* Work authorization — time-critical, and easy to miss */}
          <div className="panel">
            <div className="panel-head">
              <h3>Work Authorization</h3>
              <button className="btn sm ghost" onClick={() => go('intel')}>All milestones →</button>
            </div>
            {nextMilestones.map((m, i) => (
              <div className="row" key={i}>
                <span className="pill" style={{
                  background: m.severity === 'act' ? 'var(--bad)22' : 'var(--accent)22',
                  color: m.severity === 'act' ? 'var(--bad)' : 'var(--accent)',
                  minWidth: 74, justifyContent: 'center',
                }}>{m.window.replace(/\s*\(.*\)/, '')}</span>
                <span className="r-name">{m.title}<span className="r-sub"> · {m.action}</span></span>
              </div>
            ))}
          </div>

          {/* Weekly goals with computed progress */}
          {weeklyGoals.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h3>This Week's Targets</h3>
                <button className="btn sm ghost" onClick={() => go('actions')}>Goals →</button>
              </div>
              {weeklyGoals.map(g => {
                const pct = Math.min(100, Math.round(((g.current || 0) / Math.max(1, g.target || 1)) * 100));
                return (
                  <div className="row" key={g.id}>
                    <span className="r-name">{METRIC_LABEL[g.metric]}</span>
                    <div className="f-bar" style={{ maxWidth: 120 }}>
                      <div className="f-fill" style={{ width: pct + '%', background: pct >= 100 ? 'var(--good)' : pct >= 50 ? 'var(--accent)' : 'var(--warn)' }} />
                    </div>
                    <span className="f-num">{g.current || 0}/{g.target}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top companies */}
          <div className="panel">
            <div className="panel-head">
              <h3>Top Target Companies</h3>
              <button className="btn sm ghost" onClick={() => go('companies')}>All →</button>
            </div>
            {s.companies.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8).map(c => (
              <div className="row clickable" key={c.id} onClick={() => onOpenCompany(c.id)}>
                <span className="rank-chip">#{c.rank || '—'}</span>
                <span className="r-name">{c.name}</span>
                <span className="r-sub">{c.industry || ''}</span>
                <b style={{ fontSize: 12 }}>{c.score}/{c.maxScore || 50}</b>
              </div>
            ))}
          </div>

          {/* Recent applications */}
          <div className="panel">
            <div className="panel-head">
              <h3>Recent Applications</h3>
              <button className="btn sm ghost" onClick={() => go('pipeline')}>All →</button>
            </div>
            {s.jobs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(j => {
              const co = s.companies.find(c => c.id === j.companyId);
              const st = s.stages.find(x => x.id === j.status);
              return (
                <div className="row clickable" key={j.id} onClick={() => onOpenJob(j.id)}>
                  <span className="r-name">{j.title} <span className="r-sub">· {co?.name || ''}</span></span>
                  <span className="pill" style={{ background: st?.color + '22', color: st?.color }}>{st?.label || j.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
