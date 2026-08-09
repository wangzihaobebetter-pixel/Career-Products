/* ============================================================
   seed2.ts — Playbook seed data
   Templates, interview questions, STAR stories, resume versions,
   tasks, goals, saved searches, contact slots.

   SOURCING NOTE (important, read before trusting anything here):
   - Templates / STAR stories / resume versions / tasks / goals /
     saved searches are authored content derived from Zihao Wang's
     own resume bullets and the screening research corpus.
   - Interview questions are drawn from public role descriptions and
     the interview-prep research for these companies. They are
     *likely* questions, not leaked question banks.
   - Contacts are intentionally EMPTY-NAMED placeholder slots. No
     person's name, email, or LinkedIn is invented here. Fill them in
     from real sourcing before using them.
   ============================================================ */

import type {
  EmailTemplate, Question, StarStory, ResumeVersion,
  Task, Goal, SavedSearch, Contact,
} from './types';

const T = '2026-08-09T00:00:00.000Z';
const iso = (daysFromNow: number) =>
  new Date(Date.parse(T) + daysFromNow * 86400000).toISOString();

/* ------------------------------------------------------------
   1. EMAIL TEMPLATES — all 8 categories covered
   ------------------------------------------------------------ */
export const templates: EmailTemplate[] = [
  {
    id: 'tpl_1', name: 'Cold outreach — Applied AI / Analytics IC',
    category: 'cold_outreach',
    subject: '{{role}} at {{company}} — schema-bound agent work from an NEU Analytics grad',
    body: `Hi {{firstName}},

I came across the {{role}} opening at {{company}} and wanted to reach out directly rather than disappear into the ATS.

Short version of why I think it fits: for my Northeastern MS Analytics capstone I built a schema-bound LLM agent (Pydantic-AI + Claude) that hit 1.0 on structured-field extraction and 0.82 on explanation quality, and I shipped a zero-shot NLP routing system (BART-MNLI) that moved classification accuracy from 69% to 82%. That is the same "make the model's output actually trustworthy in a pipeline" problem I see in {{whatTheyDo}}.

Would you be open to a 15-minute conversation, or could you point me to whoever owns this hire?

Either way, thanks for reading.

Best,
Zihao Wang
{{phone}} · {{linkedin}}`,
    mergeFields: ['firstName', 'role', 'company', 'whatTheyDo', 'phone', 'linkedin'],
    tags: ['ai', 'analytics', 'ic'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_2', name: 'Referral request — Northeastern alum',
    category: 'referral_request',
    subject: 'Fellow Husky — quick question about {{company}}',
    body: `Hi {{firstName}},

I'm Zihao, finishing an MS in Analytics at Northeastern (graduating December 2026). I found you through the NEU alumni network and noticed you've been at {{company}} for {{tenure}}.

I'm applying to {{role}} ({{jobUrl}}) and would rather not be a blind application. Two things I'd genuinely value:

1. Your read on whether the team actually wants an analytics-plus-applied-AI profile, or something more traditional.
2. If it seems like a fit after that, whether you'd be comfortable referring me.

No pressure at all on #2 — #1 alone is worth the email. Resume attached either way.

Thanks,
Zihao Wang
{{phone}} · {{linkedin}}`,
    mergeFields: ['firstName', 'company', 'tenure', 'role', 'jobUrl', 'phone', 'linkedin'],
    tags: ['referral', 'neu', 'alumni'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_3', name: 'Follow-up — 7 days after applying, no response',
    category: 'follow_up',
    subject: 'Following up: {{role}} application ({{appliedDate}})',
    body: `Hi {{firstName}},

Following up on my application for {{role}}, submitted {{appliedDate}}.

One thing I didn't have room for in the application: {{newSignal}}.

If the role has moved on or been filled, a one-line "no" is completely fine and I'll stop following up. If it's still open, I'd welcome the chance to talk.

Best,
Zihao Wang`,
    mergeFields: ['firstName', 'role', 'appliedDate', 'newSignal'],
    tags: ['follow-up', 'day-7'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_4', name: 'Follow-up — second touch, day 14 (final)',
    category: 'follow_up',
    subject: 'Last note on {{role}}',
    body: `Hi {{firstName}},

Last note from me on {{role}} — I don't want to become noise in your inbox.

I'm still very interested, and if the timing is wrong right now I'd rather stay on your radar for the next opening than keep pinging this one. Happy to be filed away for later.

Thanks for your time either way.

Zihao Wang`,
    mergeFields: ['firstName', 'role'],
    tags: ['follow-up', 'day-14', 'final'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_5', name: 'Thank you — within 24h of interview',
    category: 'thank_you',
    subject: 'Thank you — {{role}} conversation today',
    body: `Hi {{firstName}},

Thank you for the time today. I left the conversation more interested than I went in, specifically because of {{specificThing}}.

One thought I kept chewing on afterwards: {{followUpThought}}.

And to close the loop on {{openQuestion}} — {{answer}}.

Looking forward to next steps.

Best,
Zihao Wang`,
    mergeFields: ['firstName', 'role', 'specificThing', 'followUpThought', 'openQuestion', 'answer'],
    tags: ['thank-you', '24h'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_6', name: 'Post-rejection — keep the door open',
    category: 'post_rejection',
    subject: 'Thanks for the update — and one ask',
    body: `Hi {{firstName}},

Thanks for letting me know, and for actually closing the loop — plenty of teams don't.

Two things:

1. If you're willing, I'd value one sentence on what separated the person you hired from me. I'd rather fix a real gap than guess at one.
2. If a role closer to {{adjacentRole}} opens up in the next couple of quarters, I'd appreciate being on the list.

Genuinely no hard feelings — good luck with the hire.

Zihao Wang`,
    mergeFields: ['firstName', 'adjacentRole'],
    tags: ['rejection', 'feedback'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_7', name: 'Salary negotiation — anchored counter',
    category: 'salary_negotiation',
    subject: 'Re: {{role}} offer',
    body: `Hi {{firstName}},

Thank you for the offer — I want to be clear up front that I want to work at {{company}}, and I intend for us to land this.

On compensation: the offer is {{offeredBase}} base. Based on {{marketEvidence}} and the scope we discussed — specifically {{scopeItem}} — I was targeting {{targetBase}}.

If {{targetBase}} base isn't reachable, I'm flexible on the shape: a {{signingAsk}} signing bonus, or a written six-month review tied to {{milestone}}, would get us there too.

Happy to talk it through live if that's easier.

Best,
Zihao Wang`,
    mergeFields: ['firstName', 'company', 'role', 'offeredBase', 'marketEvidence', 'scopeItem', 'targetBase', 'signingAsk', 'milestone'],
    tags: ['negotiation', 'offer'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_8', name: 'Cover letter — analytics / strategy & ops',
    category: 'cover_letter',
    subject: 'Application: {{role}} — Zihao Wang',
    body: `Dear {{company}} Hiring Team,

I'm applying for {{role}}. I'll keep this to the three things that actually matter.

**I have shipped analytics that changed a decision, not just a dashboard.** At OrionStar I ran visitor analytics that produced a 20% engagement lift and a 15% efficiency gain, working across tech, marketing, and ops — which meant translating the same finding three different ways for three different audiences.

**I build with LLMs as an engineer, not a prompter.** My capstone was a schema-bound agent (Pydantic-AI + Claude) evaluated at 1.0 on structured fields and 0.82 on explanation quality, plus a zero-shot BART-MNLI routing system that lifted accuracy from 69% to 82%. I care about eval harnesses and failure modes, not demos.

**I'm optimizing for the work, not the title.** {{whyThisCompany}}

I'm completing an MS in Analytics at Northeastern (December 2026), based in Boston, and open to relocation.

Thank you for your consideration.

Zihao Wang
{{phone}} · {{linkedin}}`,
    mergeFields: ['company', 'role', 'whyThisCompany', 'phone', 'linkedin'],
    tags: ['cover-letter'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_9', name: 'Networking — coffee chat after an event',
    category: 'networking',
    subject: 'Great talking at {{event}}',
    body: `Hi {{firstName}},

Good to meet you at {{event}} — I'm the Northeastern analytics student who asked about {{topic}}.

You said something I'm still thinking about: {{theirPoint}}. I went and looked into it, and {{whatIFound}}.

If you're open to 20 minutes in the next couple weeks, I'd like to hear more about how {{company}} approaches it. I'm not asking you for a job — I'm asking because it's the most interesting version of this problem I've run into.

Zihao Wang
{{linkedin}}`,
    mergeFields: ['firstName', 'event', 'topic', 'theirPoint', 'whatIFound', 'company', 'linkedin'],
    tags: ['networking', 'event'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_10', name: 'Networking — LinkedIn connection note (300 char limit)',
    category: 'networking',
    subject: '(LinkedIn connection request — no subject)',
    body: `Hi {{firstName}} — NEU Analytics grad student here. I build schema-bound LLM agents and eval harnesses; your work on {{topic}} at {{company}} is the closest thing I've found to what I want to do next. Would like to follow along. — Zihao`,
    mergeFields: ['firstName', 'topic', 'company'],
    tags: ['linkedin', 'short'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_11', name: 'Recruiter reply — inbound, scheduling',
    category: 'follow_up',
    subject: 'Re: {{role}} at {{company}} — happy to talk',
    body: `Hi {{firstName}},

Thanks for reaching out — yes, I'd like to talk about {{role}}.

To save you a round trip:
· Location: Boston, MA. Open to relocation and to remote.
· Availability: graduating December 2026 (MS Analytics, Northeastern); available for full-time start {{startDate}}.
· Work authorization: authorized to work in the US now; will require sponsorship in the future.
· Comp expectation: targeting {{targetComp}}, flexible on structure.

I'm free {{availability}}. Send whatever slot works and I'll take it.

Best,
Zihao Wang
{{phone}}`,
    mergeFields: ['firstName', 'role', 'company', 'startDate', 'targetComp', 'availability', 'phone'],
    tags: ['recruiter', 'scheduling', 'sponsorship'], useCount: 0, createdAt: T, updatedAt: T,
  },
  {
    id: 'tpl_12', name: 'Nudge — take-home submitted, no response',
    category: 'follow_up',
    subject: 'Take-home for {{role}} — submitted {{submittedDate}}',
    body: `Hi {{firstName}},

Checking in on the take-home I submitted on {{submittedDate}} for {{role}}.

If it's still in the review queue, no action needed — I just want to make sure it didn't get lost in a folder somewhere, since I know these sometimes do.

Thanks,
Zihao Wang`,
    mergeFields: ['firstName', 'role', 'submittedDate'],
    tags: ['take-home', 'follow-up'], useCount: 0, createdAt: T, updatedAt: T,
  },
];

/* ------------------------------------------------------------
   2. STAR STORIES — built from Wang's real resume bullets
   ------------------------------------------------------------ */
export const starStories: StarStory[] = [
  {
    id: 'star_1',
    title: 'Schema-bound LLM agent: making model output trustworthy enough to ship',
    situation: 'For my Northeastern MS Analytics capstone, the team needed to extract structured records from unstructured source documents. The first pass used a raw LLM call, and the output was unusable downstream: fields drifted in name and type between runs, so nothing could be joined or validated.',
    task: 'I owned making the extraction deterministic enough that a downstream pipeline could depend on it, and provable enough that we could report a number rather than a vibe.',
    action: 'I rebuilt the extractor around Pydantic-AI with Claude, binding the model to an explicit output schema so type violations failed loudly instead of silently. Then I built an evaluation harness with two separate metrics — exact-match on structured fields, and a rubric-graded score on the free-text explanation — because a single blended score would have hidden which half was broken. I iterated on the schema and prompt against that harness rather than against individual eyeballed examples.',
    result: 'Structured-field extraction reached 1.0 and explanation quality reached 0.82. More importantly, the failure mode changed: instead of quietly emitting a malformed record, the system now raises on violation, which is what made it safe to put in a pipeline at all.',
    competencies: ['technical', 'data', 'execution'],
    metrics: ['1.0 structured-field accuracy', '0.82 explanation quality'],
    tags: ['capstone', 'llm', 'pydantic-ai', 'evals'],
    effectiveness: 5, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_2',
    title: 'Zero-shot NLP routing: 69% → 82% without labeled training data',
    situation: 'A classification/routing task needed to assign incoming text to the right category, but there was no labeled training set and no budget or timeline to build one.',
    task: 'Get usable routing accuracy without supervised training data.',
    action: 'I used BART-MNLI for zero-shot classification, treating each candidate category as a natural-language hypothesis. The first version sat at 69%. Rather than accept that, I looked at the confusion pattern and found most errors were between two semantically adjacent labels, so I rewrote the hypothesis templates to make the distinction explicit rather than implicit, and tuned the decision thresholds per class instead of using one global threshold.',
    result: 'Accuracy went from 69% to 82% with zero labeled examples. The lesson I took: with zero-shot models, most of the accessible gain is in how you phrase the label space, not in the model choice.',
    competencies: ['technical', 'data', 'execution'],
    metrics: ['69% → 82% accuracy', '0 labeled examples'],
    tags: ['nlp', 'zero-shot', 'bart-mnli'],
    effectiveness: 5, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_3',
    title: 'OrionStar visitor analytics: 20% engagement lift, 15% efficiency gain',
    situation: 'At OrionStar, visitor interaction data was being collected but not used to change anything. Tech, marketing, and ops each had a different theory about what visitors wanted, and no shared evidence.',
    task: 'Turn the visitor data into decisions that all three functions would actually act on.',
    action: 'I built the analysis around where visitors dropped off rather than around aggregate volume, because volume was the number everyone already had and it had not settled any argument. Then I deliberately presented the same finding three ways — funnel mechanics for tech, message-and-segment implications for marketing, and staffing/timing implications for ops — so each team saw their own decision in it instead of someone else\'s dashboard.',
    result: 'The changes that came out of it produced a 20% engagement lift and a 15% efficiency gain. The durable part was the translation habit: an insight that only one function understands does not get implemented.',
    competencies: ['data', 'communication', 'customer'],
    metrics: ['20% engagement lift', '15% efficiency gain', '3 cross-functional teams'],
    tags: ['orionstar', 'analytics', 'cross-functional'],
    effectiveness: 5, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_4',
    title: 'Career pivot: business degree to shipping applied-AI systems',
    situation: 'My undergraduate degree is BSc Business Management with Marketing from the University of Birmingham. I came into an MS in Analytics without a computer-science foundation, alongside classmates who had been writing code for years.',
    task: 'Close a real technical gap fast enough to do the work, without pretending it was not there.',
    action: 'I chose depth over coverage: instead of surveying many tools shallowly, I picked projects that forced end-to-end ownership and learned whatever each one required. That is where the eval harness, the schema binding, and the zero-shot pipeline came from — each was a gap I hit and had to close. I also leaned hard on LLMs as a learning accelerant, which taught me their failure modes from the inside, and that turned out to be directly useful when I started building with them.',
    result: 'I finished with a 3.86 GPA and, more relevantly, shipped systems with reported metrics rather than coursework. I am candid about where I am: strong on applied AI, evaluation, and analytics translation; still building depth in classical CS fundamentals, and actively working on it.',
    competencies: ['execution', 'other'],
    metrics: ['3.86 GPA'],
    tags: ['weakness', 'growth', 'pivot', 'self-awareness'],
    effectiveness: 4, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_5',
    title: 'Disagreeing with a metric the team had already agreed on',
    situation: 'On a cross-functional project, the team settled on an aggregate engagement metric as the success measure. I thought it would go up even if the underlying experience got worse, because it counted repeat visits caused by confusion the same as repeat visits caused by interest.',
    task: 'Raise the objection without stalling a decision the team had already made and wanted to move past.',
    action: 'I did not argue in the abstract. I took the previous period\'s data and showed a concrete segment where the metric had risen while task completion fell — a real case, from our own numbers. Then I proposed the smallest possible change rather than a redesign: keep the headline metric, add completion as a paired guardrail.',
    result: 'The team adopted the paired metric. What I would keep doing: bring a counterexample from the team\'s own data rather than a principle. What I would do differently: I should have raised it during metric definition instead of after, and I now push to be in that conversation early.',
    competencies: ['communication', 'strategy', 'data'],
    metrics: [],
    tags: ['conflict', 'behavioral', 'metrics'],
    effectiveness: 4, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_6',
    title: 'Building an agent system for my own job search',
    situation: 'Searching for a role produced more information than I could hold: hundreds of postings, scattered research, follow-up dates, and no single place where any of it lived.',
    task: 'Stop managing it by memory and browser tabs.',
    action: 'I built an actual system: a screening pipeline that scores roles against explicit weighted criteria instead of gut feel, a research corpus of company and role analysis, and a local-first tracker application with a Kanban pipeline, a bullet library, templates, and a question bank. Local-first was a deliberate constraint — my job-search data is not going into someone else\'s SaaS.',
    result: '22 companies and 50 roles screened and ranked, with the top company scoring 49/50 on the rubric. The second-order result matters more: the process is now inspectable, so when something is not working I can look at which stage is leaking instead of guessing.',
    competencies: ['execution', 'technical', 'strategy'],
    metrics: ['22 companies screened', '50 roles ranked', '49/50 top score'],
    tags: ['self-directed', 'agents', 'product'],
    effectiveness: 4, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_7',
    title: 'A number I reported that turned out to be wrong',
    situation: 'Early in an analysis, I reported a result that a stakeholder was going to act on. Re-checking the pipeline afterwards, I found a filter applied at the wrong step, which meant part of the population had been excluded from the denominator.',
    task: 'Decide what to do after the number was already out.',
    action: 'I corrected it in writing the same day, to everyone who had received the original, with the corrected figure, the cause, and what it changed about the recommendation — before anyone asked. Then I added a sanity check on population counts to the pipeline so that class of error would show up automatically rather than depend on me re-reading code.',
    result: 'The direction of the recommendation held; the magnitude changed. Nobody acted on the wrong figure. I now treat "does the denominator match the population I claim to be describing" as a standing check, not a one-time fix.',
    competencies: ['data', 'communication', 'other'],
    metrics: [],
    tags: ['failure', 'integrity', 'behavioral'],
    effectiveness: 4, createdAt: T, updatedAt: T,
  },
  {
    id: 'star_8',
    title: 'Shipping under a hard deadline with an incomplete answer',
    situation: 'A deliverable was due and the analysis was not fully converged — one segment\'s behavior still had no clean explanation.',
    task: 'Deliver on time without overstating confidence in the part that was genuinely unresolved.',
    action: 'I split the deliverable explicitly: the findings I could defend, and a clearly separated open question with what I had ruled out and what I would need to resolve it. I resisted the urge to paper over the gap with a plausible-sounding hypothesis, because a confident wrong explanation would have been acted on.',
    result: 'The deliverable landed on time and the open item was scoped as follow-up work rather than discovered later as an error. The stakeholder\'s response — that the flagged unknown was the most useful part — is why I still structure deliverables this way.',
    competencies: ['execution', 'communication'],
    metrics: [],
    tags: ['deadline', 'ambiguity', 'behavioral'],
    effectiveness: 4, createdAt: T, updatedAt: T,
  },
];

/* ------------------------------------------------------------
   3. QUESTION BANK
   ------------------------------------------------------------ */
const q = (
  id: string, text: string, type: Question['type'],
  competency: Question['competency'], company: string | undefined,
  difficulty: number, starStoryId?: string, notes?: string,
): Question => ({ id, text, type, competency, company, difficulty, starStoryId, notes, createdAt: T, updatedAt: T });

export const questions: Question[] = [
  // ---- Universal behavioral ----
  q('q_1', 'Walk me through your resume.', 'behavioral', 'communication', undefined, 1, 'star_4', 'Target 90 seconds. Birmingham business degree → NEU Analytics → applied-AI projects. End on why this role.'),
  q('q_2', 'Why this company, and why now?', 'behavioral', 'strategy', undefined, 2, undefined, 'Must be non-transferable. If the answer would work for a competitor, it is not finished.'),
  q('q_3', 'Tell me about a technical project you owned end to end.', 'behavioral', 'technical', undefined, 2, 'star_1'),
  q('q_4', 'Describe a time you disagreed with your team.', 'behavioral', 'communication', undefined, 3, 'star_5'),
  q('q_5', 'Tell me about a time you failed or got something wrong.', 'behavioral', 'other', undefined, 3, 'star_7', 'Do not pick a fake weakness. The reported-wrong-number story is real and lands.'),
  q('q_6', 'What is your biggest weakness?', 'behavioral', 'other', undefined, 3, 'star_4', 'Answer: classical CS fundamentals. Name it, then name what is actively being done about it.'),
  q('q_7', 'How do you prioritize when everything is urgent?', 'behavioral', 'execution', undefined, 2, 'star_8'),
  q('q_8', 'Tell me about a time you had to explain something technical to a non-technical audience.', 'behavioral', 'communication', undefined, 2, 'star_3'),
  q('q_9', 'Where do you want to be in five years?', 'behavioral', 'strategy', undefined, 2, undefined, 'Product ownership direction. Do not say "PM" as a title grab — say the kind of decisions you want to own.'),
  q('q_10', 'You do not have a CS degree. Why should we hire you over someone who does?', 'behavioral', 'other', undefined, 4, 'star_4', 'Do not get defensive. Concede the gap precisely, then move to shipped evidence.'),

  // ---- Analytics / data technical ----
  q('q_11', 'How would you decide whether a metric movement is real or noise?', 'technical', 'data', undefined, 3, undefined, 'Baseline variance, sample size, segment decomposition, and whether a plausible mechanism exists.'),
  q('q_12', 'Engagement is up 20% but revenue is flat. Diagnose it.', 'case', 'data', undefined, 3, 'star_3', 'Mix shift, metric gaming, wrong denominator, lag between engagement and purchase.'),
  q('q_13', 'Write a SQL query to find the second-highest salary per department.', 'coding', 'data', undefined, 2, undefined, 'Window function: DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC). Know the ties edge case.'),
  q('q_14', 'Explain the difference between a LEFT JOIN and an INNER JOIN, and when a LEFT JOIN silently corrupts an aggregate.', 'technical', 'data', undefined, 2, undefined, 'The trap: NULLs from the outer side entering AVG/COUNT.'),
  q('q_15', 'What is p-hacking and how would you prevent it on your own team?', 'technical', 'data', undefined, 3, undefined),
  q('q_16', 'How do you choose a north-star metric for a product?', 'case', 'strategy', undefined, 4, 'star_5', 'Must include the guardrail-metric argument.'),
  q('q_17', 'A dashboard you built is not being used. What do you do?', 'case', 'customer', undefined, 3, 'star_3', 'The right answer starts with a decision nobody was making, not with UI.'),
  q('q_18', 'How would you design an A/B test for a feature with a very low base rate?', 'technical', 'data', undefined, 4, undefined, 'Power analysis, runtime, proxy metrics, sequential-testing risk.'),

  // ---- Applied AI / LLM ----
  q('q_19', 'How do you evaluate an LLM system where there is no single correct answer?', 'technical', 'technical', undefined, 4, 'star_1', 'Split the metric. Structured fields get exact match; free text gets a rubric grade.'),
  q('q_20', 'What is the difference between zero-shot, few-shot, and fine-tuning, and how do you decide?', 'technical', 'technical', undefined, 3, 'star_2'),
  q('q_21', 'How would you stop an LLM from returning malformed structured output?', 'technical', 'technical', undefined, 3, 'star_1', 'Schema binding, validation that fails loudly, retry with the error fed back, tool-use enforcement.'),
  q('q_22', 'Design a RAG system for internal company documents. What breaks first?', 'system_design', 'technical', undefined, 4, undefined, 'Retrieval quality and permissions, not generation. Chunking, hybrid search, stale-index handling, per-user ACLs.'),
  q('q_23', 'When should you NOT use an LLM for a problem?', 'technical', 'technical', undefined, 3, undefined, 'Deterministic rules exist, latency budget is tight, errors are unrecoverable, or the task is pure arithmetic.'),
  q('q_24', 'How do you handle hallucination in a production user-facing system?', 'technical', 'technical', undefined, 4, undefined, 'Grounding, citation enforcement, abstention paths, confidence thresholds, human review on high-stakes writes.'),
  q('q_25', 'Walk me through an agent architecture you would build for a multi-step workflow.', 'system_design', 'technical', undefined, 4, 'star_6'),

  // ---- Company-specific ----
  q('q_26', 'Klaviyo is a marketing automation platform for e-commerce. How would you measure whether a new automation feature is working?', 'case', 'data', 'Klaviyo', 3, undefined, 'Top-ranked company: 49/50. Prepare this one properly.'),
  q('q_27', 'How would you segment Klaviyo\'s SMB customers to find expansion opportunity?', 'case', 'customer', 'Klaviyo', 4, 'star_3'),
  q('q_28', 'Notion recently pushed hard into AI. How would you measure adoption of an AI feature inside a productivity tool?', 'case', 'data', 'Notion', 3, undefined, 'Application submitted 2026-08-09 — People Analytics & Ops Rotational.'),
  q('q_29', 'For a People Analytics role: how would you measure whether a rotational program is working?', 'case', 'data', 'Notion', 4, undefined),
  q('q_30', 'Glean does enterprise search across a company\'s internal tools. What is the hardest part of that problem?', 'system_design', 'technical', 'Glean', 4, undefined, 'Permissions-aware retrieval. Answer this before ranking quality.'),
  q('q_31', 'Harvey builds AI for legal work. What changes about evaluation when the domain is legal?', 'case', 'technical', 'Harvey', 4, 'star_1', 'Cost of a wrong answer is asymmetric; abstention beats a confident guess.'),
  q('q_32', 'Cursor is an AI code editor. How would you measure whether it actually makes developers faster?', 'case', 'data', 'Cursor (Anysphere)', 4, undefined, 'Acceptance rate is the trap metric. Push to task completion time and rework rate.'),
  q('q_33', 'Datadog sells observability. Pitch me a metric its customers should track but usually do not.', 'case', 'customer', 'Datadog', 4, undefined),
  q('q_34', 'Zapier is fully remote. How do you work effectively without an office?', 'culture', 'communication', 'Zapier', 2, 'star_6', 'Written-first, async, artifacts over meetings. The tracker project is the proof.'),
  q('q_35', 'Sierra and Decagon both build AI customer-service agents. How would you evaluate one against a human team?', 'case', 'customer', 'Sierra', 4, undefined),
  q('q_36', 'Mercury is a fintech bank for startups. What analytics problem is unique to fintech?', 'case', 'financial', 'Mercury', 4, undefined, 'Fraud base rates, regulatory constraints, and the cost asymmetry of false negatives.'),
  q('q_37', 'Replit serves developers and learners. How would you tell those two segments apart in the data?', 'case', 'data', 'Replit', 3, undefined),
  q('q_38', 'Intercom moved from rules-based to AI-driven support. How would you measure the transition?', 'case', 'customer', 'Intercom', 3, undefined),

  // ---- Culture / logistics ----
  q('q_39', 'What is your work authorization status?', 'culture', 'other', undefined, 1, undefined, 'Answer exactly: authorized to work in the US now; will require sponsorship in the future. Do not elaborate.'),
  q('q_40', 'What are your compensation expectations?', 'culture', 'financial', undefined, 3, undefined, 'Ask for their range first. If forced, give a researched range with a reason, never a single number.'),
  q('q_41', 'When can you start?', 'culture', 'other', undefined, 1, undefined, 'Graduating December 2026. Available full-time from January 2027; part-time earlier if useful.'),
  q('q_42', 'Do you have any questions for us?', 'culture', 'communication', undefined, 2, undefined, 'Never "no". Have three ready: what does success look like at 6 months, what is broken that this hire fixes, how does the team decide priorities.'),
];

/* ------------------------------------------------------------
   4. RESUME VERSIONS
   ------------------------------------------------------------ */
export const resumes: ResumeVersion[] = [
  {
    id: 'res_base', label: 'Base — Zihao Wang (master)', type: 'base',
    fileName: 'Zihao_Wang_Resume.pdf', mimeType: 'application/pdf',
    useCount: 0,
    notes: 'Canonical file lives at ~/Desktop/Zihao_Wang_Resume.pdf. This entry tracks usage; the PDF itself is not stored in the browser. Every tailored version below should be forked from this one.',
    createdAt: T, updatedAt: T,
  },
  {
    id: 'res_ai', label: 'Tailored — Applied AI / LLM engineering', type: 'tailored',
    parentVersionId: 'res_base',
    bulletsUsed: [], jdKeywordsMatched: ['LLM', 'evaluation', 'Pydantic', 'schema', 'zero-shot', 'NLP', 'agent', 'Python'],
    useCount: 0,
    notes: 'Lead with the capstone agent (1.0 / 0.82) and BART-MNLI (69% → 82%). Move OrionStar below. Target: Clipboard Health Applied AI, Harvey, Glean, Sierra, Decagon.',
    createdAt: T, updatedAt: T,
  },
  {
    id: 'res_analytics', label: 'Tailored — Analytics / Data Analyst', type: 'tailored',
    parentVersionId: 'res_base',
    bulletsUsed: [], jdKeywordsMatched: ['SQL', 'dashboard', 'A/B testing', 'segmentation', 'stakeholder', 'funnel', 'Tableau'],
    useCount: 0,
    notes: 'Lead with OrionStar (20% engagement / 15% efficiency) and the cross-functional translation angle. Target: Klaviyo, Datadog, Notion People Analytics, DraftKings, CarGurus.',
    createdAt: T, updatedAt: T,
  },
  {
    id: 'res_ops', label: 'Tailored — Strategy & Ops / Business Analytics', type: 'tailored',
    parentVersionId: 'res_base',
    bulletsUsed: [], jdKeywordsMatched: ['strategy', 'operations', 'cross-functional', 'growth', 'process', 'GTM'],
    useCount: 0,
    notes: 'Lead with the Birmingham business degree as an asset, not an apology. Target: Clipboard Health Revenue Strategy, Mercury, Ramp-style ops roles.',
    createdAt: T, updatedAt: T,
  },
];

/* ------------------------------------------------------------
   5. TASKS
   ------------------------------------------------------------ */
export const tasks: Task[] = [
  { id: 'tk_1', title: 'Follow up on Clipboard Health — Strategy & Ops, Applied AI', description: 'Submitted 2026-08-09. Use template tpl_3 with a new signal.', dueDate: iso(7), priority: 'high', status: 'todo', type: 'follow_up', createdAt: T, updatedAt: T },
  { id: 'tk_2', title: 'Follow up on Notion — People Analytics & Ops Rotational', description: 'Submitted 2026-08-09 18:09 EDT, success page confirmed. Use tpl_3.', dueDate: iso(7), priority: 'high', status: 'todo', type: 'follow_up', createdAt: T, updatedAt: T },
  { id: 'tk_3', title: 'Apply to Klaviyo — top-ranked company (49/50)', description: 'Highest scoring company in screening. Use res_analytics + tpl_8. Should not still be in wishlist.', dueDate: iso(2), priority: 'urgent', status: 'todo', type: 'custom', createdAt: T, updatedAt: T },
  { id: 'tk_4', title: 'Find one real NEU alum contact at each T1 company', description: 'Ten T1 companies, ten named humans. Fill the placeholder contact slots — no invented names.', dueDate: iso(5), priority: 'high', status: 'todo', type: 'research', createdAt: T, updatedAt: T },
  { id: 'tk_5', title: 'Build the Cursor answer: why acceptance rate is the wrong metric', description: 'Question q_32. Write it out, do not improvise it live.', dueDate: iso(10), priority: 'medium', status: 'todo', type: 'prep', createdAt: T, updatedAt: T },
  { id: 'tk_6', title: 'Rehearse the "no CS degree" answer out loud', description: 'Question q_10 + star_4. This one gets asked and cannot sound rehearsed-defensive.', dueDate: iso(3), priority: 'high', status: 'todo', type: 'prep', createdAt: T, updatedAt: T },
  { id: 'tk_7', title: 'Write the Glean permissions-aware retrieval answer', description: 'Question q_30. The differentiating answer, not the generic RAG one.', dueDate: iso(12), priority: 'medium', status: 'todo', type: 'prep', createdAt: T, updatedAt: T },
  { id: 'tk_8', title: 'Refresh salary research for Boston analytics roles', description: 'Needed before any comp conversation. Feeds tpl_7 marketEvidence.', dueDate: iso(14), priority: 'medium', status: 'todo', type: 'research', createdAt: T, updatedAt: T },
  { id: 'tk_9', title: 'Move 10 T1 roles from wishlist to applied', description: 'All 50 seeded roles are still in wishlist. The pipeline is not real until they move.', dueDate: iso(9), priority: 'urgent', status: 'todo', type: 'custom', createdAt: T, updatedAt: T },
  { id: 'tk_10', title: 'Fork res_ai and res_analytics from the base PDF', description: 'Two tailored versions currently exist as tracker entries only, with no actual files behind them.', dueDate: iso(4), priority: 'high', status: 'todo', type: 'send_docs', createdAt: T, updatedAt: T },
];

/* ------------------------------------------------------------
   6. GOALS
   ------------------------------------------------------------ */
export const goals: Goal[] = [
  { id: 'goal_1', period: 'week', metric: 'applications_sent', target: 10, startDate: iso(0), endDate: iso(7), createdAt: T, updatedAt: T },
  { id: 'goal_2', period: 'week', metric: 'networking_conversations', target: 3, startDate: iso(0), endDate: iso(7), createdAt: T, updatedAt: T },
  { id: 'goal_3', period: 'week', metric: 'follow_ups_sent', target: 5, startDate: iso(0), endDate: iso(7), createdAt: T, updatedAt: T },
  { id: 'goal_4', period: 'month', metric: 'interviews_completed', target: 6, startDate: iso(0), endDate: iso(30), createdAt: T, updatedAt: T },
  { id: 'goal_5', period: 'quarter', metric: 'offers_received', target: 2, startDate: iso(0), endDate: iso(90), createdAt: T, updatedAt: T },
];

/* ------------------------------------------------------------
   7. SAVED SEARCHES
   ------------------------------------------------------------ */
export const savedSearches: SavedSearch[] = [
  { id: 'ss_1', name: 'Applied AI — entry level, US remote', query: 'applied AI OR LLM OR machine learning', filters: { level: ['entry', 'mid'], remoteType: ['remote', 'anywhere'] }, alertEnabled: true, alertFrequency: 'daily', createdAt: T, updatedAt: T },
  { id: 'ss_2', name: 'Data / Product Analyst — Boston', query: 'data analyst OR product analyst', filters: { location: 'Boston', remoteType: ['hybrid', 'onsite', 'remote'] }, alertEnabled: true, alertFrequency: 'daily', createdAt: T, updatedAt: T },
  { id: 'ss_3', name: 'Strategy & Ops — new grad', query: 'strategy and operations OR business operations', filters: { level: ['entry'] }, alertEnabled: true, alertFrequency: 'weekly', createdAt: T, updatedAt: T },
  { id: 'ss_4', name: 'T1 watchlist — any new opening', query: '', filters: { tier: ['T1'] }, alertEnabled: true, alertFrequency: 'instant', createdAt: T, updatedAt: T },
  { id: 'ss_5', name: 'Sponsorship-friendly employers', query: 'visa sponsorship OR H-1B', filters: {}, alertEnabled: false, alertFrequency: 'weekly', createdAt: T, updatedAt: T },
];

/* ------------------------------------------------------------
   8. CONTACT SLOTS — deliberately unnamed
   No person's name, email, or profile is invented. Each slot is a
   placeholder attached to a real target company; fill it from real
   sourcing (task tk_4) before using it.
   ------------------------------------------------------------ */
const slot = (
  id: string, companyId: string, company: string,
  relationship: Contact['relationship'], role: string,
): Contact => ({
  id, companyId, name: `[unfilled] ${company} — ${role}`,
  title: role, relationship, warmth: 0, status: 'not_contacted',
  notes: 'Placeholder slot. No real person is recorded here yet — find a named contact before any outreach.',
  createdAt: T, updatedAt: T,
});

export const contacts: Contact[] = [
  slot('ct_1', 'co_1', 'Klaviyo', 'recruiter', 'Recruiter / Talent'),
  slot('ct_2', 'co_1', 'Klaviyo', 'alum', 'NEU alum on an analytics team'),
  slot('ct_3', 'co_2', 'Cursor (Anysphere)', 'hiring_manager', 'Hiring manager'),
  slot('ct_4', 'co_3', 'Datadog', 'recruiter', 'Recruiter / Talent'),
  slot('ct_5', 'co_3', 'Datadog', 'alum', 'NEU alum'),
  slot('ct_6', 'co_4', 'SS&C Technologies', 'recruiter', 'Recruiter / Talent'),
  slot('ct_7', 'co_5', 'Decagon', 'hiring_manager', 'Hiring manager'),
  slot('ct_8', 'co_6', 'Veeam', 'recruiter', 'Recruiter / Talent'),
  slot('ct_9', 'co_7', 'Glean', 'hiring_manager', 'Hiring manager'),
  slot('ct_10', 'co_7', 'Glean', 'teammate', 'Engineer or analyst on the team'),
  slot('ct_11', 'co_8', 'Sierra', 'hiring_manager', 'Hiring manager'),
  slot('ct_12', 'co_9', 'Chainguard', 'recruiter', 'Recruiter / Talent'),
  slot('ct_13', 'co_10', 'Zapier', 'recruiter', 'Recruiter / Talent'),
  slot('ct_14', 'co_11', 'Notion', 'recruiter', 'Recruiter — People Analytics'),
  slot('ct_15', 'co_12', 'Harvey', 'hiring_manager', 'Hiring manager'),
  slot('ct_16', 'co_13', 'Intercom', 'recruiter', 'Recruiter / Talent'),
  slot('ct_17', 'co_16', 'Mercury', 'hiring_manager', 'Hiring manager'),
  slot('ct_18', 'co_22', 'Replit', 'recruiter', 'Recruiter / Talent'),
];

export default {
  templates, starStories, questions, resumes,
  tasks, goals, savedSearches, contacts,
};
