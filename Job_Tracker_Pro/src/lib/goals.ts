/* ============================================================
   Goal progress.

   A goal stores only its target and its window. Progress is never
   stored — it is counted from the real records inside that window,
   so a goal can never claim credit for work that isn't in the data.

   Shared by the Dashboard and the Action Board; keeping one
   implementation means the two surfaces cannot disagree about how
   far along a target is.
   ============================================================ */

import type { GoalMetric, JobApplication, Contact, InterviewEvent, Task, SalaryOffer } from '../types';

export const METRIC_LABEL: Record<GoalMetric, string> = {
  applications_sent: 'Applications sent',
  interviews_completed: 'Interviews completed',
  offers_received: 'Offers received',
  networking_conversations: 'Networking conversations',
  follow_ups_sent: 'Follow-ups sent',
};

export interface GoalProgressInput {
  jobs: JobApplication[];
  interviews: InterviewEvent[];
  offers: SalaryOffer[];
  contacts: Contact[];
  tasks: Task[];
}

export function goalProgress(
  metric: GoalMetric,
  startDate: string,
  endDate: string,
  d: GoalProgressInput,
): number {
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  const within = (date?: string) => {
    if (!date) return false;
    const t = new Date(date).getTime();
    return t >= s && t <= e;
  };
  switch (metric) {
    case 'applications_sent':
      return d.jobs.filter(j => within(j.appliedDate)).length;
    case 'interviews_completed':
      return d.interviews.filter(i => i.outcome !== 'pending' && within(i.scheduledAt)).length;
    case 'offers_received':
      return d.offers.filter(o => within(o.createdAt)).length;
    case 'networking_conversations':
      return d.contacts.filter(c => c.status === 'engaged' || c.status === 'intro_done' || c.status === 'advocate').length;
    case 'follow_ups_sent':
      return d.tasks.filter(t => t.type === 'follow_up' && t.status === 'done' && within(t.completedAt)).length;
    default:
      return 0;
  }
}
