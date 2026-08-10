// 90-day job search operating plan.
//
// Source: BurnE06_90DayPlan_v2_2026-08-09.md (M3 Research Burn), cross-checked
// against BurnX01_CrossReview_90DayStrategy_2026-08-09.md. Baselines quoted here
// (69 applications, 0 interviews, LinkedIn restricted twice) are verified facts
// from the application log, not estimates.
//
// Day 1 is 2026-08-09; the 90-day horizon closes 2026-11-07, chosen so an offer
// lands before the December graduation / OPT start window rather than after it.

export interface PlanItem { id: string; text: string; note?: string }
export interface PlanWeek { id: string; label: string; dates: string; theme: string; items: PlanItem[] }
export interface PlanPhase {
  id: string; n: number; name: string; dates: string; days: string;
  thesis: string; goals: string[]; weeks: PlanWeek[];
  deliverables: string[]; earlyWarnings: string[];
}

export const PLAN_START = '2026-08-09';
export const PLAN_END = '2026-11-07';

export const phases: PlanPhase[] = [
  {
    id: 'p1', n: 1, name: 'Positioning & Assets', dates: 'Aug 9 → Sep 7', days: 'Day 1–30',
    thesis: 'Fix the root cause of 69 applications and 0 interviews: the resume, the positioning, and the absence of one verifiable work sample.',
    goals: [
      'Resume v3 shipped and frozen (one number-driven project bullet)',
      'Positioning locked on all three axes — no further edits allowed',
      'One public, verifiable work sample (GitHub Pages / Notion / portfolio)',
      'Two real industry contacts — practitioners, not recruiters',
    ],
    weeks: [
      { id:'p1w1', label:'W1', dates:'Aug 9 → Aug 16', theme:'Asset inventory', items:[
        { id:'p1w1a', text:'Answer the 5 open facts questions', note:'What the capstone actually produced (quantified); which single direction the resume sells; whether CPT went to OGS; whether the GitHub code can be public; whether SS&C was applied to.' },
        { id:'p1w1b', text:'Rewrite the resume as v3' },
        { id:'p1w1c', text:'Collect quantified numbers for every past project', note:'Even "X data points / Y rows / Z iterations" counts. A bullet without a number does not survive screening.' },
      ]},
      { id:'p1w2', label:'W2', dates:'Aug 17 → Aug 23', theme:'Work sample #1', items:[
        { id:'p1w2a', text:'Pick the subject of work sample #1', note:'Recommended: package the JobSearchAgent portfolio work as a readable product case — it is itself the proof of capability.' },
        { id:'p1w2b', text:'Publish it as a single public page (GitHub Pages or Notion)' },
        { id:'p1w2c', text:'Write one 800–1200 word post on why an LLM-driven job search' },
      ]},
      { id:'p1w3', label:'W3', dates:'Aug 24 → Aug 30', theme:'Channel reset', items:[
        { id:'p1w3a', text:'LinkedIn: full 7-day cooldown, zero automation', note:'RED LINE. The account has been restricted twice. No agent touches it.' },
        { id:'p1w3b', text:'Pause every cron job that touches LinkedIn' },
        { id:'p1w3c', text:'Send 5–8 connection requests by hand', note:'By Wang personally. Rebuilds a human activity baseline.' },
        { id:'p1w3d', text:'Draft one InMail — reviewed, then sent manually' },
      ]},
      { id:'p1w4', label:'W4', dates:'Aug 31 → Sep 7', theme:'Cold start', items:[
        { id:'p1w4a', text:'Apply to 5 precise Tier-1 roles with the new resume' },
        { id:'p1w4b', text:'Run one board-API sweep', note:'Board APIs, not page fetching — 40 seconds versus 130k tokens for the same result.' },
        { id:'p1w4c', text:'Reach 2 real industry contacts', note:'NEU alumni first.' },
        { id:'p1w4d', text:'Update the LinkedIn headline to the target persona' },
      ]},
    ],
    deliverables: [
      'resume_v3.pdf frozen and filed',
      'Portfolio page reachable at a public URL',
      '5 new applications, every one verified at the confirmation page',
      '2 industry contacts logged with date and channel',
      'LinkedIn headline matches the target persona',
    ],
    earlyWarnings: [
      'End of W2 with no work sample chosen → cut scope, ship the single page within a week',
      'End of W3 still restricted on LinkedIn → stop touching it, slide the rhythm to W5',
      'End of W4 with 5 applications and 0 verified → go to failure mode 1',
    ],
  },
  {
    id: 'p2', n: 2, name: 'Leverage & Volume', dates: 'Sep 8 → Oct 8', days: 'Day 31–60',
    thesis: 'Phase 1 assets go to volume: 30 applications, 6 InMails, 3 coffees — enough to break through.',
    goals: [
      '30 applications, all verified (confirmation page, not "submitted")',
      '6 InMails sent (4/week is the ceiling under current LinkedIn limits)',
      '3 one-on-one conversations completed (30 minutes each)',
      '2 interviews, phone screens included',
    ],
    weeks: [
      { id:'p2w5', label:'W5–W6', dates:'Sep 8 → Sep 21', theme:'Channel expansion', items:[
        { id:'p2w5a', text:'Source entirely through board APIs (Greenhouse / Lever / Ashby / Workday)' },
        { id:'p2w5b', text:'Filter locally by regex', note:'Drop senior/staff/II/III, drop US-citizen-only, drop 3+ years required.' },
        { id:'p2w5c', text:'Pre-check the questionnaire for every new Workday employer', note:'One 15-step browser pass buys back a wasted application.' },
        { id:'p2w5d', text:'Cap at 4 applications/day — 2 morning, 2 afternoon', note:'Not 8/day. Volume without fit is the loop that produced 69 → 0.' },
      ]},
      { id:'p2w7', label:'W7–W8', dates:'Sep 22 → Oct 5', theme:'Network amplification', items:[
        { id:'p2w7a', text:'Send all 6 InMails by hand after review', note:'No sub-agent touches LinkedIn messaging.' },
        { id:'p2w7b', text:'Follow up by hand within 5 days of each InMail' },
        { id:'p2w7c', text:'Book 3 conversations: one founder, one alum, one practitioner' },
      ]},
      { id:'p2w9', label:'W9', dates:'Oct 6 → Oct 8', theme:'Buffer', items:[
        { id:'p2w9a', text:'Sort every conversation into rejected / read-no-reply / unread' },
        { id:'p2w9b', text:'Write a private retrospective' },
        { id:'p2w9c', text:'Set up Phase 3' },
      ]},
    ],
    deliverables: [
      '30 new applications logged (35 cumulative)',
      '6 InMails verifiably sent',
      '3 one-on-one conversations logged',
      'At least 2 interviews — a 5-minute hiring-manager screen counts',
    ],
    earlyWarnings: [
      'End of W6 with fewer than 10 applications → do not scale, the resume is still the problem, return to Phase 1',
      'End of W7 with a third LinkedIn restriction → close that channel permanently, move to cold email and X DMs',
      'End of W8 with 0 interviews → go to failure mode 2',
    ],
  },
  {
    id: 'p3', n: 3, name: 'Close & Negotiate', dates: 'Oct 9 → Nov 7', days: 'Day 61–90',
    thesis: 'Push live interview loops to an offer. If there are no loops, find the root cause, fix it, or accept the timeline.',
    goals: [
      '12–15 interviews (phone screens and onsites)',
      '1–3 offers',
      'Negotiation finished by Nov 7',
    ],
    weeks: [
      { id:'p3w10', label:'W10–W11', dates:'Oct 9 → Oct 22', theme:'Interview density', items:[
        { id:'p3w10a', text:'1–2 interviews per day, onsites concentrated in W11' },
        { id:'p3w10b', text:'30 minutes before every interview: reread the JD, read 30 days of company news, rehearse one question' },
        { id:'p3w10c', text:'Thank-you note within 24 hours, written by hand off a fixed template' },
      ]},
      { id:'p3w12', label:'W12–W13', dates:'Oct 23 → Nov 7', theme:'Negotiate and close', items:[
        { id:'p3w12a', text:'Do not respond to an offer within the first 24 hours', note:'A deliberate pause, not a tactic. It buys judgment.' },
        { id:'p3w12b', text:'Negotiate three things: base, signing bonus, start date', note:'Start date matters because of OPT sequencing.' },
        { id:'p3w12c', text:'Keep 5–10 fallback applications running in parallel' },
        { id:'p3w12d', text:'After Nov 7, keep applying at lower density — long-horizon mode' },
      ]},
    ],
    deliverables: [
      '50–60 applications cumulative',
      '12 or more interviews logged',
      '1–3 offers',
      'Start date, salary and title recorded',
    ],
    earlyWarnings: [
      'End of W11 with 0 offers → go to failure mode 6',
      'End of W12 with 0 interviews → this is not tactics, it is positioning; restart Phase 1',
    ],
  },
];

export interface WeeklyTarget { channel: string; p1: string; p2: string; p3: string }

export const weeklyTargets: WeeklyTarget[] = [
  { channel:'Applications (verified)', p1:'5 /wk', p2:'7–8 /wk', p3:'3–5 /wk' },
  { channel:'LinkedIn InMail (by hand)', p1:'0', p2:'1–2 /wk', p3:'1 /wk' },
  { channel:'LinkedIn connections (by hand)', p1:'1–2 /day', p2:'2–3 /day', p3:'1–2 /day' },
  { channel:'Cold email / network', p1:'2 /wk', p2:'3–4 /wk', p3:'2 /wk' },
  { channel:'One-on-one conversations', p1:'0.5 /wk', p2:'0.75 /wk', p3:'0.5 /wk' },
  { channel:'Interview prep (mock + answers)', p1:'0', p2:'1–2 /wk', p3:'2–3 /wk' },
];

export const targetsRationale: string[] = [
  'Measured baseline: 69 applications over 13 days is 5.3/day of real throughput, and it returned a 0% interview rate. Throughput was never the constraint.',
  'W1–W4 at 5/week is deliberately low. Phase 1 repairs the asset; one more application on the wrong resume is one more wasted application.',
  'W5–W8 at 7–8/week is roughly 1.5 a day — a rhythm, not a sprint.',
  'W9–W13 drops to 3–5/week because interview time has to come from somewhere.',
  'Do not treat 8 applications/day as a KPI. That is the exact loop that produced 69 → 0.',
];

export interface FailureMode { id: string; n: number; name: string; trigger: string; signals: string[]; responses: string[] }

export const failureModes: FailureMode[] = [
  { id:'fm1', n:1, name:'Applying before the resume is fixed',
    trigger:'Applications resume in Phase 1 W1–W4 without the rewrite',
    signals:['End of W4: 5 applications, 0 verified','End of W4: no new verified application at all'],
    responses:['Freeze applications immediately and return to Phase 1','Do not "apply while we fix it" — that is the demonstrated dead loop'] },
  { id:'fm2', n:2, name:'30 applications, 0 interviews',
    trigger:'Fewer than 10 applications by end of W6, or 0 interviews by end of W8',
    signals:['A single channel (ATS only) for more than 6 weeks','Resume view rate under 5%','Every InMail unanswered'],
    responses:['Stop new applications for one week and do 5 one-on-ones instead','Reread 5 rejected JDs against the resume, keyword by keyword','Ship resume v3.1 with stronger quantified bullets','Open the backup pool of 30 companies'] },
  { id:'fm3', n:3, name:'LinkedIn restricted a third time',
    trigger:'Any automation touching LinkedIn profile, messaging or InMail',
    signals:['URL shows /checkpoint/challenge/','"unusual activity" or "temporarily restricted"'],
    responses:['Stop every LinkedIn automation, not just the one that tripped','Wang unlocks it personally; no agent retries','7-day cooldown, then at most 5 hand-sent connections a day','Three restrictions in 30 days → LinkedIn automation ends permanently'] },
  { id:'fm4', n:4, name:'Killed by a knockout question',
    trigger:'Answering the future-sponsorship question in a way that trips an automatic filter',
    signals:['An ineligibility email within the hour'],
    responses:['Pre-check the questionnaire before applying','On a new Workday employer, walk one throwaway req to the questionnaire and read it','Skip any JD carrying a citizenship-only or sponsorship knockout'] },
  { id:'fm5', n:5, name:'Momentum collapse',
    trigger:'7 days without interaction, no watchdog signal, or a LinkedIn cooldown',
    signals:['Long idle stretches after a burst of applications'],
    responses:['Keep the resume watchdog at 45 minutes','Sub-agents persist output the moment they finish','Over 4 hours with no output counts as a fault — write it to the resume queue'] },
  { id:'fm6', n:6, name:'No offer at day 90',
    trigger:'0 offers at end of W11 or W13',
    signals:['Fewer than 3 interviews by end of W10','No final round by end of W11'],
    responses:['90 days with no offer is not failure — six-month cycles are common','Open the fallback pool (10–15 applications through Nov 30)','After December graduation, shift to long-horizon mode at 3 applications/week','Do not accept a bad offer under pressure'] },
  { id:'fm7', n:7, name:'Volume-for-its-own-sake returns',
    trigger:'Anxiety converts into a numeric KPI that replaces judgment',
    signals:['More than 12 applications in a week','Fit stops being considered','Resume view rate under 3%'],
    responses:['Invoke the standing rule: do not apply just to be applying','The weekly self-check forces a written reason for 5 of the applications','More than 10 new log rows in a week triggers a pause'] },
  { id:'fm8', n:8, name:'False completion by an agent',
    trigger:'A sub-agent reports done having actually done nothing',
    signals:['Runtime under 30s, output under 1k tokens, zero tool calls'],
    responses:['The test is runtime + output size + a persisted artifact; missing any one means it did not happen','Re-check any "0 applications" claim through an independent path','Trust the live page, not the agent\'s own echo'] },
];

export interface CheckSection { id: string; title: string; items: PlanItem[] }

export const weeklyCheck: CheckSection[] = [
  { id:'wc_num', title:'Numbers — every line needs a figure', items:[
    { id:'wc_n1', text:'Verified applications this week', note:'Target 5–8' },
    { id:'wc_n2', text:'InMails sent by hand', note:'Target 0–2' },
    { id:'wc_n3', text:'LinkedIn connections sent by hand', note:'Target 7–21' },
    { id:'wc_n4', text:'Cold emails / one-on-one touches', note:'Target 2–4' },
    { id:'wc_n5', text:'Interview invitations received' },
    { id:'wc_n6', text:'Interviews completed' },
    { id:'wc_n7', text:'Offers' },
    { id:'wc_n8', text:'New rows in the application log', note:'More than 10 is an alarm, not an achievement' },
  ]},
  { id:'wc_qual', title:'Quality — answer each in writing', items:[
    { id:'wc_q1', text:'Which 3 applications this week fit best, and why?' },
    { id:'wc_q2', text:'Which single application was the worst, and why was it sent?' },
    { id:'wc_q3', text:'What surprised you this week?' },
    { id:'wc_q4', text:'What did you learn?' },
    { id:'wc_q5', text:'Who deserves a thank-you or a follow-up?' },
  ]},
  { id:'wc_state', title:'State — early warnings', items:[
    { id:'wc_s1', text:'LinkedIn account: normal / cooling / restricted' },
    { id:'wc_s2', text:'Resume version in use, and is it the frozen file?' },
    { id:'wc_s3', text:'Is the portfolio page still reachable?' },
    { id:'wc_s4', text:'Are the top 5 target companies still hiring?', note:'Recheck through the board API.' },
  ]},
  { id:'wc_next', title:'Next week — three things', items:[
    { id:'wc_x1', text:'The one application that matters most' },
    { id:'wc_x2', text:'The one networking move that matters most' },
    { id:'wc_x3', text:'The one thing to learn' },
  ]},
];

export const allCheckIds: string[] = [
  ...phases.flatMap(p => p.weeks.flatMap(w => w.items.map(i => i.id))),
  ...weeklyCheck.flatMap(s => s.items.map(i => i.id)),
];
