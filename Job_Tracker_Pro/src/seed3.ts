import type { Question } from './types';

/* ------------------------------------------------------------
   SEED 3 — Company interview questions from live market research
   ------------------------------------------------------------
   Source: BurnR03_Interview_Intel_2026-08-09.md, a live web-research
   pass run on 2026-08-09 against Interview Query, Glassdoor, Blind,
   levels.fyi, public LinkedIn posts and company careers pages.

   These are *reported or likely* questions, not a leaked question
   bank. Some are verbatim from a candidate write-up; others are the
   research pass's reconstruction of a known round. Treat every entry
   as a preparation prompt, not a guarantee of what will be asked.

   Each question carries the documented round count for that company
   so you know how deep the loop goes before you walk in.
   ------------------------------------------------------------ */

const T = '2026-08-09T00:00:00.000Z';

const q = (
  id: string, text: string, type: Question['type'],
  competency: Question['competency'], company: string | undefined,
  difficulty: number, notes?: string,
): Question => ({
  id, text, type, competency, company, difficulty,
  notes, createdAt: T, updatedAt: T,
});

/** Documented loop depth per company, from the same research pass. */
const ROUNDS: Record<string, number> = {
  Klaviyo: 5, HubSpot: 7, Datadog: 6, Toast: 5, Wayfair: 0,
  DraftKings: 4, CarGurus: 5, Notion: 4, Ramp: 5, Mercury: 0,
  Glean: 3, Harvey: 3,
};

const src = (company: string, extra?: string) => {
  const r = ROUNDS[company];
  const depth = r
    ? `${company} runs ${r} documented rounds.`
    : `${company}'s round structure is not publicly documented.`;
  return `Live research 2026-08-09, traced to public write-ups. ${depth}${extra ? ' ' + extra : ''}`;
};

export const researchQuestions: Question[] = [
  /* ---------------- Klaviyo — SQL is the gate ---------------- */
  q('qr_1', 'Calculate the percentage of subscribers who clicked an email in January but did not click any email in February.', 'technical', 'data', 'Klaviyo', 4,
    src('Klaviyo', 'Retention/churn SQL on a real Klaviyo-shaped dataset. Expect multi-table joins and window functions.')),
  q('qr_2', 'Write a SQL query to get the average order value by gender, given transactions, users and products tables.', 'technical', 'technical', 'Klaviyo', 3,
    src('Klaviyo', 'Three-table join. State your assumption about how gender is stored before you write.')),
  q('qr_3', 'Walk me through a complex SQL query you wrote and the problem it solved.', 'technical', 'technical', 'Klaviyo', 3,
    src('Klaviyo', 'Have one query memorised end to end — the business problem first, the SQL second.')),
  q('qr_4', 'Describe a project where you used data to drive a business decision. What was the outcome?', 'behavioral', 'communication', 'Klaviyo', 2,
    src('Klaviyo', 'Outcome must be a number. "It helped the team" is a failed answer.')),
  q('qr_5', 'How do you approach hypothesis testing?', 'case', 'data', 'Klaviyo', 3,
    src('Klaviyo', 'They expect R or Python for the test, not just the definition.')),
  q('qr_6', 'How do you ensure data quality and integrity?', 'case', 'data', 'Klaviyo', 3,
    src('Klaviyo', 'Name concrete checks: row counts, null rates, referential integrity, freshness SLAs.')),
  q('qr_7', 'Tell me about collaborating across Product and Engineering.', 'behavioral', 'communication', 'Klaviyo', 2,
    src('Klaviyo', 'Cross-functional collaboration is an explicit rubric line in the final rounds.')),
  q('qr_8', 'What metrics would you track for an SMS marketing campaign?', 'case', 'data', 'Klaviyo', 3,
    src('Klaviyo', 'Product Analyst track. Separate leading (delivery, open, CTR) from lagging (revenue per recipient, opt-out rate).')),

  /* ---------------- HubSpot — storytelling is scored ---------------- */
  q('qr_9', 'Why HubSpot, and why this role specifically?', 'behavioral', 'strategy', 'HubSpot', 2,
    src('HubSpot', 'Early rounds lean heavily on this. An answer that would also fit Salesforce is a failed answer.')),
  q('qr_10', 'Take-home case: analyse the dataset and present your findings.', 'case', 'data', 'HubSpot', 4,
    src('HubSpot', 'Graded on how you think and explain, not on technical grind. Lead with the recommendation, then the evidence.')),
  q('qr_11', 'Talk me through how you would explain this analysis to a non-technical stakeholder.', 'behavioral', 'communication', 'HubSpot', 3,
    src('HubSpot', 'Concise storytelling is treated as evidence of the skill, not as presentation polish.')),

  /* ---------------- Datadog — stay calm in messy data ---------------- */
  q('qr_12', 'Here is a messy dataset. Walk me through how you would investigate it.', 'case', 'data', 'Datadog', 4,
    src('Datadog', 'Candidates who rush into code lose ground. Narrate the plan before typing.')),
  q('qr_13', 'How would you work with an engineering team to instrument a new product surface?', 'case', 'technical', 'Datadog', 3,
    src('Datadog', 'Observability company — they expect you to think in events, tags and cardinality.')),
  q('qr_14', 'The dashboard is visually broken. What do you do first?', 'case', 'data', 'Datadog', 3,
    src('Datadog', 'They are testing composure with visibly wrong data, not your chart skills.')),

  /* ---------------- Toast — restaurant-scale ambiguity ---------------- */
  q('qr_15', 'What experience do you have with SQL and how have you used it?', 'technical', 'technical', 'Toast', 2, src('Toast')),
  q('qr_16', 'How do you ensure data integrity when working across multiple data sources?', 'case', 'data', 'Toast', 3, src('Toast')),
  q('qr_17', 'How would you approach solving an ambiguous data problem?', 'case', 'strategy', 'Toast', 3,
    src('Toast', 'Scope it out loud: who is the decision-maker, what decision changes, what data would settle it.')),
  q('qr_18', 'Tell me about a time you faced pushback from a stakeholder.', 'behavioral', 'communication', 'Toast', 2, src('Toast')),
  q('qr_19', 'Tell me about the most challenging data project you worked on and how you approached it.', 'behavioral', 'execution', 'Toast', 3, src('Toast')),
  q('qr_20', 'Maximum Profit: given a list of prices, compute the maximum profit with at most two transactions.', 'coding', 'technical', 'Toast', 4,
    src('Toast', 'A real algorithmic question in an analytics loop. Practise the two-pass DP form.')),

  /* ---------------- Wayfair — pricing and AI usage ---------------- */
  q('qr_21', 'How would you decide whether to increase the price of an item?', 'case', 'data', 'Wayfair', 4,
    src('Wayfair', 'Elasticity, margin, competitive position, cannibalisation. Propose the experiment.')),
  q('qr_22', 'How do you use AI in your analysis process?', 'case', 'technical', 'Wayfair', 2,
    src('Wayfair', 'Answer honestly and concretely — this is your strength. Name the tool, the task and the verification step.')),
  q('qr_23', 'Tell me about a difficult situation on a past project and how you worked through it with the team.', 'behavioral', 'communication', 'Wayfair', 2, src('Wayfair')),

  /* ---------------- DraftKings — estimation under pressure ---------------- */
  q('qr_24', 'Estimate the odds for a given bowling game outcome.', 'case', 'data', 'DraftKings', 4,
    src('DraftKings', 'Probability estimation out loud. State assumptions, build the model, sanity-check the number.')),
  q('qr_25', 'Two trains problem, asked as a timed reasoning exercise.', 'case', 'data', 'DraftKings', 3,
    src('DraftKings', 'A deliberate time-sink. Manage the clock and say when you are moving on.')),
  q('qr_26', 'You are given messy, incomplete inputs. How do you reason to a decision anyway?', 'case', 'strategy', 'DraftKings', 3,
    src('DraftKings', 'They explicitly want analysts who can act on incomplete inputs.')),

  /* ---------------- CarGurus — stats literacy ---------------- */
  q('qr_27', 'What statistical methods are you familiar with, and how have you applied them?', 'technical', 'data', 'CarGurus', 3, src('CarGurus')),
  q('qr_28', 'A PM sees p = 0.04 on an A/B test and wants to ship. Is the result valid?', 'case', 'data', 'CarGurus', 4,
    src('CarGurus', 'Peeking, multiple comparisons, sample ratio mismatch, effect size vs significance, and whether the metric matches the decision.')),
  q('qr_29', 'How would you measure whether a new listing feature worked?', 'case', 'data', 'CarGurus', 3, src('CarGurus')),

  /* ---------------- Notion — speed vs durability ---------------- */
  q('qr_30', 'How do you balance shipping speed against long-term architecture quality?', 'case', 'strategy', 'Notion', 3,
    src('Notion', 'Answer with a real tradeoff you made and what you would revisit.')),
  q('qr_31', 'How would you build a People Analytics report that a leadership team will actually use?', 'case', 'data', 'Notion', 3,
    src('Notion', 'Relevant to the People Analytics & Ops role you already applied to.')),

  /* ---------------- Ramp — fraud, risk and SQL depth ---------------- */
  q('qr_32', 'How would you optimise a data system for better analytics performance?', 'case', 'technical', 'Ramp', 4, src('Ramp')),
  q('qr_33', 'Walk me through the most complex SQL query you have written.', 'technical', 'technical', 'Ramp', 3, src('Ramp')),
  q('qr_34', 'What is the difference between KYC and OFAC screening?', 'technical', 'strategy', 'Ramp', 3,
    src('Ramp', 'Domain knowledge check. KYC verifies identity; OFAC screens against sanctions lists. Know that both exist before the call.')),
  q('qr_35', 'Run a root cause analysis on a fraud event.', 'case', 'data', 'Ramp', 4,
    src('Ramp', 'Structure it: detection, scope, mechanism, blast radius, control gap, fix.')),
  q('qr_36', 'How do you prioritise multiple projects with competing deadlines?', 'behavioral', 'execution', 'Ramp', 2, src('Ramp')),
  q('qr_37', 'Tell me about working cross-functionally to implement a policy change.', 'behavioral', 'communication', 'Ramp', 3, src('Ramp')),

  /* ---------------- Mercury — database reasoning ---------------- */
  q('qr_38', 'Walk me through the database design tradeoffs you would weigh for this schema.', 'system_design', 'technical', 'Mercury', 4,
    src('Mercury', 'They care whether you can reason through tradeoffs and spot the failure mode, not whether you recite normal forms.')),

  /* ---------------- Glean — retrieval with permissions ---------------- */
  q('qr_39', 'How would you evaluate whether an enterprise search result is good?', 'case', 'technical', 'Glean', 4,
    src('Glean', 'Relevance plus permissions. A correct result the user is not allowed to see is a failure, not a hit.')),
  q('qr_40', 'How do you keep a retrieval system correct when document permissions change?', 'system_design', 'technical', 'Glean', 4,
    src('Glean', 'Permissions-aware retrieval is the hard part of their product. Do not answer with generic RAG.')),

  /* ---------------- Harvey — applied AI depth ---------------- */
  q('qr_41', 'Transform an input string into a target tokenized sequence.', 'coding', 'technical', 'Harvey', 4,
    src('Harvey', 'ML Engineer loop. Tokenisation mechanics, not model theory.')),
  q('qr_42', 'Present a past AI-focused solution you built.', 'behavioral', 'technical', 'Harvey', 3,
    src('Harvey', 'Your schema-bound agent project fits here. Lead with the evaluation numbers.')),
  q('qr_43', 'How would you evaluate an LLM system where there is no single correct answer?', 'case', 'technical', 'Harvey', 4,
    src('Harvey', 'Rubric-based grading, LLM-as-judge with its own validation, human spot-checks, and a held-out set.')),
];

export default { researchQuestions };
