import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useModal } from '../components/Modal';
import { toast } from '../components/Toast';
import type { Task, TaskPriority, TaskType, GoalMetric } from '../types';
import { computeFollowUps } from '../lib/followups';

/* ============================================================
   Action Board — tasks, goals, saved searches (spec §5 Outreach
   cadence + §7 Goals). This is the "what do I do today" surface.
   ============================================================ */

const PRIO_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIO_COLOR: Record<TaskPriority, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#4f8bff', low: '#64748b',
};

const METRIC_LABEL: Record<GoalMetric, string> = {
  applications_sent: 'Applications sent',
  interviews_completed: 'Interviews completed',
  offers_received: 'Offers received',
  networking_conversations: 'Networking conversations',
  follow_ups_sent: 'Follow-ups sent',
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

function bucketOf(t: Task): 'overdue' | 'today' | 'week' | 'later' | 'nodate' {
  if (!t.dueDate) return 'nodate';
  const due = startOfDay(new Date(t.dueDate));
  const today = startOfDay(new Date());
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  return 'later';
}

const BUCKETS: { key: ReturnType<typeof bucketOf>; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', tone: '#ef4444' },
  { key: 'today', label: 'Due today', tone: '#f97316' },
  { key: 'week', label: 'Next 7 days', tone: '#4f8bff' },
  { key: 'later', label: 'Later', tone: '#64748b' },
  { key: 'nodate', label: 'No due date', tone: '#6b7280' },
];

export default function Actions() {
  const state = useStore();
  const [showDone, setShowDone] = useState(false);
  const [filterType, setFilterType] = useState<'all' | TaskType>('all');

  const tasks = useMemo(() => {
    return state.tasks
      .filter(t => (showDone ? true : t.status !== 'done'))
      .filter(t => (filterType === 'all' ? true : t.type === filterType))
      .slice()
      .sort((a, b) => {
        const p = PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
        if (p !== 0) return p;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });
  }, [state.tasks, showDone, filterType]);

  const openCount = state.tasks.filter(t => t.status !== 'done').length;
  const overdueCount = state.tasks.filter(t => t.status !== 'done' && bucketOf(t) === 'overdue').length;
  const doneCount = state.tasks.filter(t => t.status === 'done').length;

  /* --- goal progress computed from real records, never invented --- */
  const goalProgress = (metric: GoalMetric, startDate: string, endDate: string) => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    const within = (d?: string) => { if (!d) return false; const t = new Date(d).getTime(); return t >= s && t <= e; };
    switch (metric) {
      case 'applications_sent':
        return state.jobs.filter(j => within(j.appliedDate)).length;
      case 'interviews_completed':
        return state.interviews.filter(i => i.outcome !== 'pending' && within(i.scheduledAt)).length;
      case 'offers_received':
        return state.offers.filter(o => within(o.createdAt)).length;
      case 'networking_conversations':
        return state.contacts.filter(c => c.status === 'engaged' || c.status === 'intro_done' || c.status === 'advocate').length;
      case 'follow_ups_sent':
        return state.tasks.filter(t => t.type === 'follow_up' && t.status === 'done' && within(t.completedAt)).length;
      default:
        return 0;
    }
  };

  const addTask = () => {
    const modal = useModal();
    modal.open(<TaskForm onDone={() => { modal.close(); toast('Task added'); }} />);
  };

  /* Derived nudges. These are not stored — they are recomputed from
     pipeline state every render, so they can never go stale. */
  const [dismissed, setDismissed] = useState<string[]>([]);
  const suggestions = useMemo(() => computeFollowUps({
    jobs: state.jobs,
    contacts: state.contacts,
    interviews: state.interviews,
    tasks: state.tasks,
    companyName: (cid) => state.companies.find(c => c.id === cid)?.name || '—',
  }).filter(s => !dismissed.includes(s.id)), [state.jobs, state.contacts, state.interviews, state.tasks, state.companies, dismissed]);

  const SUG_TONE: Record<string, string> = { overdue: '#ef4444', today: '#f97316', soon: '#64748b' };

  const jobTitle = (jobId?: string) => {
    if (!jobId) return null;
    const j = state.jobs.find(x => x.id === jobId);
    if (!j) return null;
    const co = state.companies.find(c => c.id === j.companyId);
    return `${j.title}${co ? ' · ' + co.name : ''}`;
  };

  return (
    <div>
      <div className="toolbar">
        <div className="kpi-inline">
          <b>{openCount}</b> open
          {overdueCount > 0 && <span style={{ color: '#ef4444', marginLeft: 10 }}><b>{overdueCount}</b> overdue</span>}
          <span className="muted2" style={{ marginLeft: 10 }}>{doneCount} done</span>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
          <option value="all">All types</option>
          <option value="follow_up">Follow-up</option>
          <option value="prep">Prep</option>
          <option value="research">Research</option>
          <option value="send_docs">Send docs</option>
          <option value="send_thanks">Send thanks</option>
          <option value="submit_assessment">Submit assessment</option>
          <option value="custom">Custom</option>
        </select>
        <label className="chk"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Show completed</label>
        <button className="btn" onClick={addTask}>＋ New Task</button>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div>
          {BUCKETS.map(b => {
            const items = tasks.filter(t => bucketOf(t) === b.key);
            if (items.length === 0) return null;
            return (
              <div className="panel mb12" key={b.key}>
                <div className="panel-head">
                  <h3><span className="kan-dot" style={{ background: b.tone }} /> {b.label}</h3>
                  <span className="muted2 text-sm">{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(t => (
                    <div className="row task-row" key={t.id} style={{ alignItems: 'flex-start', gap: 9 }}>
                      <input
                        type="checkbox"
                        checked={t.status === 'done'}
                        onChange={() => { state.toggleTask(t.id); }}
                        style={{ marginTop: 3 }}
                        aria-label={`Complete ${t.title}`}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                          opacity: t.status === 'done' ? 0.55 : 1,
                        }}>{t.title}</div>
                        {t.description && <div className="muted text-sm" style={{ marginTop: 2 }}>{t.description}</div>}
                        <div className="flex" style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span className="chip" style={{ borderColor: PRIO_COLOR[t.priority], color: PRIO_COLOR[t.priority] }}>{t.priority}</span>
                          <span className="chip">{t.type.replace(/_/g, ' ')}</span>
                          {t.dueDate && <span className="chip">{new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          {jobTitle(t.jobId) && <span className="chip">{jobTitle(t.jobId)}</span>}
                        </div>
                      </div>
                      <button
                        className="btn ghost sm"
                        title="Delete task"
                        onClick={() => { state.removeTask(t.id); toast('Task deleted'); }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div className="panel">
              <div className="muted text-sm">
                Nothing open. Either the board is genuinely clear, or work is happening
                that never got written down — the second one is how a pipeline goes quiet.
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="panel mb12">
            <div className="panel-head">
              <h3>Suggested follow-ups</h3>
              <span className="muted2 text-sm">{suggestions.length}</span>
            </div>
            {suggestions.length === 0 ? (
              <div className="muted text-sm">
                Nothing is overdue by the cadence rules. These are derived from stage age,
                expected-reply dates, interview recency and contact silence — not from a list
                you have to maintain.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestions.slice(0, 12).map(s => (
                  <div key={s.id} style={{ background: 'var(--panel2)', borderRadius: 8, padding: 10 }}>
                    <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                      <span className="kan-dot" style={{ background: SUG_TONE[s.urgency] }} />
                      <b style={{ fontSize: 12.5 }}>{s.title}</b>
                    </div>
                    <div className="muted2 text-sm" style={{ margin: '4px 0 6px' }}>{s.why}</div>
                    <div className="flex" style={{ gap: 6 }}>
                      <button className="btn sm" onClick={() => {
                        state.addTask({
                          title: s.title, jobId: s.jobId, contactId: s.contactId,
                          type: s.suggestedTaskType,
                          priority: s.urgency === 'overdue' ? 'urgent' : 'high',
                          dueDate: new Date().toISOString().slice(0, 10),
                        });
                        setDismissed(d => [...d, s.id]);
                        toast('Added to the board');
                      }}>＋ Make it a task</button>
                      <button className="btn sm ghost" onClick={() => setDismissed(d => [...d, s.id])}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="muted2 text-sm mt12">
              Dismissing hides an item for this session only. If the underlying state doesn't
              change, it comes back — which is the point.
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Goals</h3><span className="muted2 text-sm">{state.goals.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.goals.map(g => {
                const done = goalProgress(g.metric, g.startDate, g.endDate);
                const pct = Math.min(100, Math.round((done / Math.max(1, g.target)) * 100));
                return (
                  <div key={g.id}>
                    <div className="flex-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span>{METRIC_LABEL[g.metric]} <span className="muted2">/ {g.period}</span></span>
                      <b>{done} / {g.target}</b>
                    </div>
                    <div className="f-bar">
                      <div className="f-fill" style={{
                        width: Math.max(2, pct) + '%',
                        background: pct >= 100 ? '#22c55e' : pct >= 50 ? '#4f8bff' : '#f59e0b',
                      }} />
                    </div>
                  </div>
                );
              })}
              {state.goals.length === 0 && <div className="muted text-sm">No goals set.</div>}
            </div>
            <div className="muted2 text-sm mt12">
              Progress counts real records only — a goal moves when a job gets an applied date,
              an interview gets an outcome, or a follow-up task is checked off.
            </div>
          </div>

          <div className="panel mt12">
            <div className="panel-head"><h3>Saved Searches</h3><span className="muted2 text-sm">{state.savedSearches.length}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.savedSearches.map(ss => (
                <div key={ss.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ss.name}</div>
                    {ss.query && <div className="muted2 text-sm" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{ss.query}</div>}
                  </div>
                  <span className="chip">{ss.alertEnabled ? (ss.alertFrequency || 'daily') : 'off'}</span>
                </div>
              ))}
              {state.savedSearches.length === 0 && <div className="muted text-sm">No saved searches.</div>}
            </div>
            <div className="muted2 text-sm mt12">
              Saved searches are stored criteria, not a live crawler — this app has no backend
              and will not fetch job boards for you.
            </div>
          </div>

          <div className="panel mt12">
            <div className="panel-head"><h3>Recent Activity</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {state.activity.slice(0, 12).map(a => (
                <div key={a.id} className="flex" style={{ gap: 8, fontSize: 12 }}>
                  <span className="muted2" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, minWidth: 76 }}>
                    {new Date(a.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span>{a.summary}</span>
                </div>
              ))}
              {state.activity.length === 0 && <div className="muted text-sm">No activity recorded yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ onDone }: { onDone: () => void }) {
  const state = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('custom');
  const [dueDate, setDueDate] = useState('');
  const [jobId, setJobId] = useState('');

  const submit = () => {
    if (!title.trim()) { toast('Title is required'); return; }
    state.addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority, type,
      dueDate: dueDate || undefined,
      jobId: jobId || undefined,
    });
    onDone();
  };

  return (
    <div>
      <h3>New Task</h3>
      <div className="form">
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Follow up on ..." autoFocus /></label>
        <label>Notes<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></label>
        <div className="grid grid-2">
          <label>Priority<select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
            <option value="urgent">Urgent</option><option value="high">High</option>
            <option value="medium">Medium</option><option value="low">Low</option>
          </select></label>
          <label>Type<select value={type} onChange={e => setType(e.target.value as TaskType)}>
            <option value="follow_up">Follow-up</option><option value="prep">Prep</option>
            <option value="research">Research</option><option value="send_docs">Send docs</option>
            <option value="send_thanks">Send thanks</option><option value="custom">Custom</option>
          </select></label>
        </div>
        <label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
        <label>Linked job<select value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">— none —</option>
          {state.jobs.map(j => {
            const co = state.companies.find(c => c.id === j.companyId);
            return <option key={j.id} value={j.id}>{j.title}{co ? ' · ' + co.name : ''}</option>;
          })}
        </select></label>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={() => useModal().close()}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add Task</button>
      </div>
    </div>
  );
}
