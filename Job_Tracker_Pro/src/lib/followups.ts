/* ============================================================
   Follow-up cadence engine.

   Mature trackers don't wait for you to remember to nudge someone —
   they derive the nudge from state. This module turns the current
   pipeline into a ranked list of "you should do this today" items.

   Pure functions: no store, no React. `now` is injectable so the
   rules are testable at a fixed date.
   ============================================================ */

import type { JobApplication, Contact, InterviewEvent, StageId, Task } from '../types';

export type SuggestionKind =
  | 'follow_up_application'
  | 'chase_stale_interview'
  | 'send_thank_you'
  | 'nudge_contact'
  | 'log_outcome'
  | 'unblock_wishlist'
  | 'close_ghosted';

export interface Suggestion {
  id: string;                 // stable, so dismissing/creating a task can dedupe
  kind: SuggestionKind;
  title: string;
  why: string;                // the rule that fired, in plain language
  urgency: 'overdue' | 'today' | 'soon';
  jobId?: string;
  contactId?: string;
  interviewId?: string;
  suggestedTaskType: Task['type'];
  daysIdle: number;
}

const DAY = 86_400_000;
const daysBetween = (a: number, b: number) => Math.floor((a - b) / DAY);

/* Per-stage patience. These are the numbers a real job search runs on:
   an applied-but-silent role is worth one nudge at 7 days and is
   effectively dead at 30; a post-onsite silence is worth chasing much
   sooner, because you are far enough in that a nudge is expected. */
const STAGE_RULES: Partial<Record<StageId, { nudgeAfter: number; deadAfter: number }>> = {
  applied:      { nudgeAfter: 7,  deadAfter: 30 },
  phone_screen: { nudgeAfter: 5,  deadAfter: 21 },
  technical:    { nudgeAfter: 5,  deadAfter: 21 },
  onsite:       { nudgeAfter: 4,  deadAfter: 18 },
  final:        { nudgeAfter: 3,  deadAfter: 14 },
  offer:        { nudgeAfter: 2,  deadAfter: 10 },
  negotiating:  { nudgeAfter: 2,  deadAfter: 10 },
  researching:  { nudgeAfter: 10, deadAfter: 45 },
  wishlist:     { nudgeAfter: 14, deadAfter: 60 },
};

const urgencyFor = (idle: number, threshold: number): Suggestion['urgency'] =>
  idle >= threshold * 2 ? 'overdue' : idle >= threshold ? 'today' : 'soon';

/* ------------------------------------------------------------------
   Per-job health, derived from the same patience table as the
   suggestions above. The pipeline board uses this to colour cards, so
   "stuck" means one thing everywhere in the app rather than each view
   inventing its own 14-day rule.
   ------------------------------------------------------------------ */
export type HealthLevel = 'ok' | 'stale' | 'ghosting' | 'closed';

export interface JobHealth {
  level: HealthLevel;
  daysIdle: number;
  reason: string;
}

export function jobHealth(job: JobApplication, now: number = Date.now()): JobHealth {
  const idle = daysBetween(now, new Date(job.lastTouchedAt).getTime());

  if (['accepted', 'rejected', 'withdrawn', 'ghosted'].includes(job.status)) {
    return { level: 'closed', daysIdle: idle, reason: 'Application is closed.' };
  }

  const rule = STAGE_RULES[job.status];
  if (!rule) return { level: 'ok', daysIdle: idle, reason: 'No cadence rule for this stage.' };

  if (idle >= rule.deadAfter) {
    return {
      level: 'ghosting',
      daysIdle: idle,
      reason: `${idle}d silent at "${job.status}" — past the ${rule.deadAfter}-day cutoff. Treat as ghosted.`,
    };
  }
  if (idle >= rule.nudgeAfter) {
    return {
      level: 'stale',
      daysIdle: idle,
      reason: `${idle}d with no movement — nudge threshold for "${job.status}" is ${rule.nudgeAfter}d.`,
    };
  }
  return { level: 'ok', daysIdle: idle, reason: `Last touched ${idle}d ago; within the ${rule.nudgeAfter}-day window.` };
}

/** Convenience for filter bars and KPI tiles. */
export function needsAttention(job: JobApplication, now: number = Date.now()): boolean {
  const h = jobHealth(job, now);
  return h.level === 'stale' || h.level === 'ghosting';
}

export interface FollowUpInput {
  jobs: JobApplication[];
  contacts: Contact[];
  interviews: InterviewEvent[];
  tasks: Task[];
  companyName: (companyId: string) => string;
  now?: number;
}

export function computeFollowUps(input: FollowUpInput): Suggestion[] {
  const now = input.now ?? Date.now();
  const out: Suggestion[] = [];

  /* Anything already captured as an open task shouldn't be suggested twice. */
  const openTaskJobIds = new Set(
    input.tasks.filter(t => t.status !== 'done' && t.status !== 'canceled' && t.jobId).map(t => t.jobId)
  );

  for (const job of input.jobs) {
    if (job.archived) continue;
    if (['accepted', 'rejected', 'withdrawn', 'ghosted'].includes(job.status)) continue;

    const rule = STAGE_RULES[job.status];
    if (!rule) continue;

    const idle = daysBetween(now, new Date(job.lastTouchedAt).getTime());
    const co = input.companyName(job.companyId);

    /* Past the dead line: the honest move is to mark it ghosted, not to
       keep it sitting in the pipeline inflating your numbers. */
    if (idle >= rule.deadAfter && job.status !== 'wishlist') {
      out.push({
        id: `dead:${job.id}`,
        kind: 'close_ghosted',
        title: `Close out ${job.title} @ ${co}`,
        why: `${idle} days with no movement at "${job.status}" — past the ${rule.deadAfter}-day mark. Mark it ghosted so your funnel stays honest.`,
        urgency: 'overdue',
        jobId: job.id,
        suggestedTaskType: 'custom',
        daysIdle: idle,
      });
      continue;
    }

    if (idle >= rule.nudgeAfter && !openTaskJobIds.has(job.id)) {
      if (job.status === 'wishlist') {
        out.push({
          id: `wish:${job.id}`,
          kind: 'unblock_wishlist',
          title: `Apply or drop: ${job.title} @ ${co}`,
          why: `Sitting in Wishlist for ${idle} days. A wishlist role that never gets applied to is just a bookmark.`,
          urgency: urgencyFor(idle, rule.nudgeAfter),
          jobId: job.id,
          suggestedTaskType: 'research',
          daysIdle: idle,
        });
      } else {
        out.push({
          id: `nudge:${job.id}`,
          kind: 'follow_up_application',
          title: `Follow up on ${job.title} @ ${co}`,
          why: `No movement for ${idle} days at "${job.status}" (nudge threshold ${rule.nudgeAfter} days).`,
          urgency: urgencyFor(idle, rule.nudgeAfter),
          jobId: job.id,
          suggestedTaskType: 'follow_up',
          daysIdle: idle,
        });
      }
    }

    /* An expected-response date that has passed is a stronger signal than
       generic idleness, so it gets its own item. */
    if (job.expectedResponseDate) {
      const overdueBy = daysBetween(now, new Date(job.expectedResponseDate).getTime());
      if (overdueBy > 0 && !openTaskJobIds.has(job.id)) {
        out.push({
          id: `expected:${job.id}`,
          kind: 'follow_up_application',
          title: `Expected reply passed — ${job.title} @ ${co}`,
          why: `You expected to hear back ${overdueBy} day${overdueBy === 1 ? '' : 's'} ago.`,
          urgency: 'overdue',
          jobId: job.id,
          suggestedTaskType: 'follow_up',
          daysIdle: overdueBy,
        });
      }
    }
  }

  for (const iv of input.interviews) {
    const when = new Date(iv.scheduledAt).getTime();
    const since = daysBetween(now, when);
    const job = input.jobs.find(j => j.id === iv.jobId);
    const label = job ? `${job.title} @ ${input.companyName(job.companyId)}` : 'interview';

    /* Thank-you note: the window that actually matters is the first 24h. */
    if (since >= 0 && since <= 2 && !iv.followUpSentAt) {
      out.push({
        id: `thanks:${iv.id}`,
        kind: 'send_thank_you',
        title: `Send thank-you — ${iv.type.replace(/_/g, ' ')}, ${label}`,
        why: since === 0
          ? 'Interviewed today. The thank-you note lands best within 24 hours.'
          : `Interviewed ${since} day${since === 1 ? '' : 's'} ago and no follow-up is logged yet.`,
        urgency: since === 0 ? 'today' : 'overdue',
        jobId: iv.jobId,
        interviewId: iv.id,
        suggestedTaskType: 'send_thanks',
        daysIdle: since,
      });
    }

    /* A round that happened and still says "pending" is missing data —
       every downstream stat is wrong until it's logged. */
    if (since >= 1 && iv.outcome === 'pending') {
      out.push({
        id: `outcome:${iv.id}`,
        kind: 'log_outcome',
        title: `Log outcome — ${iv.type.replace(/_/g, ' ')}, ${label}`,
        why: `The round was ${since} day${since === 1 ? '' : 's'} ago and is still marked pending. Your conversion stats are wrong until this is recorded.`,
        urgency: since >= 3 ? 'overdue' : 'today',
        jobId: iv.jobId,
        interviewId: iv.id,
        suggestedTaskType: 'custom',
        daysIdle: since,
      });
    }

    /* Upcoming round with nothing prepped. */
    if (since < 0 && since >= -3 && !(iv.prepChecklist && iv.prepChecklist.length)) {
      out.push({
        id: `prep:${iv.id}`,
        kind: 'chase_stale_interview',
        title: `Prep for ${iv.type.replace(/_/g, ' ')} — ${label}`,
        why: `Scheduled in ${Math.abs(since)} day${Math.abs(since) === 1 ? '' : 's'} with no prep checklist saved.`,
        urgency: since >= -1 ? 'today' : 'soon',
        jobId: iv.jobId,
        interviewId: iv.id,
        suggestedTaskType: 'prep',
        daysIdle: since,
      });
    }
  }

  for (const c of input.contacts) {
    /* Placeholder rows (no real person behind them yet) are not nudgeable. */
    if (!c.name || c.name.startsWith('[unfilled]')) continue;

    if (c.nextFollowUpAt) {
      const due = daysBetween(now, new Date(c.nextFollowUpAt).getTime());
      if (due >= 0) {
        out.push({
          id: `contactdue:${c.id}`,
          kind: 'nudge_contact',
          title: `Follow up with ${c.name}`,
          why: due === 0 ? 'Follow-up scheduled for today.' : `Follow-up was due ${due} day${due === 1 ? '' : 's'} ago.`,
          urgency: due === 0 ? 'today' : 'overdue',
          contactId: c.id,
          suggestedTaskType: 'follow_up',
          daysIdle: due,
        });
        continue;
      }
    }

    /* Reached out, no reply, and going cold. One nudge, then stop. */
    if (c.status === 'reached_out' && c.lastContactedAt) {
      const idle = daysBetween(now, new Date(c.lastContactedAt).getTime());
      if (idle >= 7 && idle <= 21) {
        out.push({
          id: `coldnudge:${c.id}`,
          kind: 'nudge_contact',
          title: `Second touch: ${c.name}`,
          why: `Reached out ${idle} days ago with no reply logged. One polite second touch is normal; a third is not.`,
          urgency: idle >= 14 ? 'overdue' : 'today',
          contactId: c.id,
          suggestedTaskType: 'follow_up',
          daysIdle: idle,
        });
      }
    }
  }

  const rank = { overdue: 0, today: 1, soon: 2 };
  return out.sort((a, b) => rank[a.urgency] - rank[b.urgency] || b.daysIdle - a.daysIdle);
}
