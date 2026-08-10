import type { InterviewEvent, InterviewType, Company, JobApplication, Question } from '../types';

/* ============================================================
   Interview prep generation

   The Interviews view tells the user that "the prep checklist and
   scorecard become available on that entry". This module is what makes
   that true: given an interview, the job and the company, it produces a
   checklist that is specific enough to be worth doing.

   Two sources feed it:
     1. A per-round template — what you always do before a recruiter call
        is not what you do before a system design round.
     2. The record itself — a missing meeting link, an unnamed
        interviewer, or a company with a known angle each produce their
        own line, because those are the things people forget.
   ============================================================ */

const BY_TYPE: Record<InterviewType, string[]> = {
  recruiter_call: [
    'Write a 90-second "why this company, why this role" out loud once',
    'Decide your salary range answer before the call, not during it',
    'Prepare the work-authorization answer: authorized now, sponsorship needed later',
    'Have 3 questions ready about team, scope and timeline',
  ],
  hiring_manager: [
    'Read the JD line by line; map each requirement to one concrete thing you have done',
    'Prepare 2 STAR stories with numbers in the result',
    'Prepare one question about how this manager measures success in the first 90 days',
  ],
  technical_phone: [
    'Warm up: 3 SQL problems (window function, self join, cohort retention)',
    'Re-read your own project so you can explain the data model from memory',
    'Set up a scratch pad and check screen sharing works',
  ],
  take_home_review: [
    'Re-read your submission and list the 3 decisions you would defend',
    'Prepare the honest answer for what you would do with one more week',
    'Know your numbers cold — every figure in the deliverable',
  ],
  system_design: [
    'Practice the frame: requirements, constraints, data model, flow, failure modes, metrics',
    'Prepare one design you have actually built and can draw end to end',
    'Rehearse saying the trade-off out loud instead of picking silently',
  ],
  coding: [
    'Warm up on 2 problems in the language you will actually use',
    'Practice narrating while typing — silence reads as being stuck',
    'Confirm the environment (their IDE, CoderPad, your machine) beforehand',
  ],
  behavioral: [
    'Pick 5 STAR stories that cover conflict, failure, influence, ambiguity, ownership',
    'For each story, know the metric and what you would do differently',
    'Prepare the "no CS background" answer as a strength, not an apology',
  ],
  onsite: [
    'Get the full agenda and every interviewer name in advance',
    'Look up each interviewer and prepare one question specific to them',
    'Plan food, water and the route or the setup 30 minutes early',
    'Prepare a closing question for the last round about next steps and timeline',
  ],
  panel: [
    'Get every panelist name and role in advance',
    'Prepare to repeat your core story cleanly for people who have not heard it',
    'Practice addressing the whole panel, not only whoever asked',
  ],
  final: [
    'Prepare a crisp answer to "why should we pick you over the other finalist"',
    'Decide in advance what your acceptance conditions are',
    'Prepare questions that only a senior person can answer',
  ],
  reference_check: [
    'Warn your references and tell them the role and what to emphasise',
    'Send each reference the JD and your one-line framing of the role',
  ],
  offer_call: [
    'Know your number, your walk-away and your first counter before you pick up',
    'Do not accept on the call — thank them and ask for it in writing',
    'Prepare the two non-salary asks (start date, equipment budget, review timing)',
  ],
  informal_chat: [
    'Have a specific reason for the conversation — not "learn more"',
    'Prepare one question they are uniquely able to answer',
    'Decide the ask you will make at the end',
  ],
};

/* Round-agnostic lines. Kept short: a checklist nobody finishes is a
   checklist nobody reads. */
const ALWAYS = [
  'Re-read the job description the morning of',
  'Test camera, mic and connection 15 minutes before',
];

export function buildPrepChecklist(
  iv: Pick<InterviewEvent, 'type' | 'interviewerName' | 'meetingLink'>,
  job?: JobApplication,
  company?: Company,
  questions: Question[] = [],
): { text: string; done: boolean }[] {
  const out: string[] = [];

  out.push(...(BY_TYPE[iv.type] || []));

  if (!iv.interviewerName) out.push('Ask the recruiter who you will be speaking with');
  if (!iv.meetingLink) out.push('Confirm the meeting link or dial-in');

  if (company) {
    out.push(`Read ${company.name}'s latest product or engineering post and form one opinion about it`);
    if (company.angle) out.push(`Bring your angle for ${company.name} — the one you wrote in Companies`);
  }
  if (job?.sourceUrl) out.push('Re-open the original posting and check it has not changed');

  /* Company-specific questions already in the bank are the highest-value
     prep item available, so they go in by name rather than as a generic
     "review the question bank" line. */
  const co = company?.name?.toLowerCase();
  const specific = co
    ? questions.filter(q => q.company && q.company.toLowerCase() === co).slice(0, 4)
    : [];
  specific.forEach(q => out.push(`Rehearse: ${q.text.slice(0, 110)}${q.text.length > 110 ? '…' : ''}`));

  out.push(...ALWAYS);

  // Same line can arrive from two sources; keep the first occurrence.
  const seen = new Set<string>();
  return out.filter(t => (seen.has(t) ? false : (seen.add(t), true)))
            .map(text => ({ text, done: false }));
}

export const SCORE_DIMENSIONS = [
  ['technical', 'Technical depth'],
  ['communication', 'Communication'],
  ['problemSolving', 'Problem solving'],
  ['culture', 'Culture / fit'],
  ['overall', 'Overall'],
] as const;

export type ScoreKey = typeof SCORE_DIMENSIONS[number][0];

export const EMPTY_SCORECARD = {
  technical: 0, communication: 0, problemSolving: 0, culture: 0, overall: 0,
};

/* A self-scorecard is only useful if it can be compared across rounds,
   so we average the four graded dimensions rather than trusting the
   "overall" the user picked in the moment. */
export function scorecardAverage(sc?: InterviewEvent['selfScorecard']): number | null {
  if (!sc) return null;
  const vals = [sc.technical, sc.communication, sc.problemSolving, sc.culture].filter(v => v > 0);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
