/* ------------------------------------------------------------
   SEED 4 — Company interview intel + work-authorisation timeline
   ------------------------------------------------------------
   Sources, both live web-research passes run on 2026-08-09:
     - BurnR13_Interview_RealQuestions_2026-08-09.md  (25 companies)
     - BurnR03_Interview_Intel_2026-08-09.md          (12 companies)
     - BurnR2_02_LiveResearch_2026-08-09.md           (visa / sponsorship)
     - BurnR14_Comp_Visa_Negotiation_2026-08-09.md    (comp anchors)

   EVIDENCE GRADES — read these before you trust a line:
     'firsthand' — a named public write-up quoted the round or the
                   question. The URL is in `sources`.
     'partial'   — fragments only: a careers page, a levels.fyi row,
                   a comment thread that names the round but not the
                   content.
     'inferred'  — no public write-up was found. The process below is
                   the research pass's reconstruction from the job
                   description and from how comparable companies hire.
                   Prepare against it; do not quote it as fact.

   This is reference data. It is deliberately NOT in the persisted
   store — it never changes from inside the app, so keeping it out
   avoids a localStorage migration every time the research updates.
   ------------------------------------------------------------ */

export type Evidence = 'firsthand' | 'partial' | 'inferred';

export interface IntelRound {
  /** Round name as the company (or the write-up) calls it. */
  name: string;
  /** What actually happens in it. */
  detail: string;
  /** Minutes, or a range, when documented. */
  length?: string;
}

export interface CompanyIntel {
  company: string;
  hq: string;
  status: string;
  sector: string;
  careersUrl: string;
  /** Total documented rounds, or undefined when nobody has published it. */
  rounds?: number;
  evidence: Evidence;
  /** Comp anchor with its as-of date, or undefined when not found. */
  comp?: string;
  loop: IntelRound[];
  /** What they actually test. */
  focus: string[];
  /** The specific way candidates lose this loop. */
  traps: string[];
  /** Application → offer, when documented. */
  timeline?: string;
  sources: string[];
  /** Anything that changes whether he should apply at all. */
  caution?: string;
}

const T = '2026-08-09';

export const companyIntel: CompanyIntel[] = [
  {
    company: 'Notion',
    hq: 'San Francisco',
    status: 'Private, ~$11B valuation, ~500 employees',
    sector: 'AI workspace (docs / databases / agents)',
    careersUrl: 'https://www.notion.com/careers',
    rounds: 5,
    evidence: 'firsthand',
    comp: `levels.fyi ${T}: range is unusually wide — Accountant $90K to SWE Manager $805K. 4-year vest, 25%/yr.`,
    loop: [
      { name: 'Take-home project', length: '5-day deadline, ~4–6h of work', detail: 'Verbatim brief: "Build a simplified block based editor with different block types (text, heading, list), drag and drop reordering, and undo/redo." Graded on three named axes: code organisation, component design, state management. React + TypeScript, reducer pattern for undo/redo.' },
      { name: 'Pair programming — live extension', length: '60 min', detail: 'You extend your own take-home with the interviewer: "He asked me to add toggle lists and nested blocks." The interviewer refactors alongside you. The stated axis is "how you work with someone else, not just how you code alone."' },
      { name: 'System design', length: '—', detail: "Notion's real-time collaboration: Operational Transforms vs CRDTs, concurrent edits to one block, WebSockets, conflict resolution when two users delete and edit the same block simultaneously. Unusual for new grad — they want structured thinking, not CRDT depth." },
      { name: 'Cross-functional product round', length: '45 min', detail: 'Run by someone from Product. Verbatim: "Users complain Notion is slow on large pages and asked me to diagnose causes and propose solutions from both a product and engineering angle." Graded purely on communication and structured thinking.' },
      { name: 'Behavioral', length: '30 min', detail: 'Why Notion / a project you are proud of / how you handle changing requirements.' },
    ],
    focus: ['Real working style over puzzle speed', 'State management reasoning', 'Product + engineering dual framing', 'Collaboration under feedback'],
    traps: [
      'Round 2 is not a test with an audience. Talk through your thinking — the interviewer is acting as a teammate and is scoring collaboration.',
      'Do not gold-plate the take-home with animation. Community consensus: keep it purely functional, spend the time on the reducer.',
    ],
    timeline: 'Apply → recruiter ≈ 1 week; take-home → round 2 ≈ 1 week; 5 weeks end to end.',
    sources: [
      'https://safereddit.com/r/InterviewCoderHQ/comments/1r32gip/interviewed_at_notion_for_new_grad_swe_heres/',
      'https://safereddit.com/r/leetcode/comments/1nnpraw/notion_final_round_interviews/',
      'https://www.levels.fyi/companies/notion/salaries',
      'https://www.notion.com/careers',
    ],
  },
  {
    company: 'Klaviyo',
    hq: 'Boston, MA',
    status: 'Public (NYSE: KVYO), 8,100+ employees',
    sector: 'B2C CRM — email + SMS marketing automation, deeply tied to Shopify',
    careersUrl: 'https://www.klaviyo.com/careers',
    rounds: 5,
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst total comp $131K–$190K, common $149K–$173K. 4-year RSUs, 25%/yr.`,
    loop: [
      { name: 'Recruiter phone screen', length: '30 min', detail: 'Background, motivation, role and company fit.' },
      { name: 'Technical interview', length: 'video', detail: 'SQL queries and data manipulation on a Klaviyo-shaped dataset. Multi-table joins and window functions are explicitly named. Sometimes a coding exercise.' },
      { name: 'Take-home assignment', length: 'sometimes', detail: 'Analyse a dataset and present findings in a structured way.' },
      { name: 'Hiring manager 1:1', length: '—', detail: 'Prior projects plus product and metric sense.' },
      { name: 'Final rounds / panel', length: '—', detail: 'Multiple team members and stakeholders; behavioral plus cross-functional collaboration. Sometimes a presentation to senior staff.' },
    ],
    focus: ['SQL (joins, window functions)', 'Retention and churn cohort analysis', 'Hypothesis testing in R or Python', 'Data quality practice', 'Storytelling with data'],
    traps: [
      '"It helped the team" is a failed answer. Every project story needs a number attached to the outcome.',
      'SWE loops here are multi-file and incremental — five tasks where "each having an extension of the earlier one". Not LeetCode.',
    ],
    timeline: 'One public data point: recruiter call to offer ≈ 1 month.',
    sources: [
      'https://www.interviewquery.com/interview-guides/klaviyo-business-intelligence',
      'https://safereddit.com/r/csMajors/comments/1r32gip/',
      'https://www.klaviyo.com/careers',
    ],
  },
  {
    company: 'HubSpot',
    hq: 'Cambridge, MA',
    status: 'Public (HUBS)',
    sector: 'CRM / marketing / sales software',
    careersUrl: 'https://www.hubspot.com/careers',
    rounds: 7,
    evidence: 'firsthand',
    comp: `levels.fyi ${T}: Data Analyst median $190K (base $180K + RSU $10K).`,
    loop: [
      { name: 'Application', detail: 'HubSpot publishes its own funnel: you hear within 5 days whether you advance.' },
      { name: 'Recruiter phone', detail: 'Standard screen.' },
      { name: 'Take-home (sometimes)', detail: 'Role play, coding, or a content assignment depending on the function.' },
      { name: 'Manager phone', detail: 'Depth on your analytical work.' },
      { name: 'Face-to-face Zoom, 3–5 rounds', detail: 'SQL, case study, whiteboarding your analysis, cross-functional stakeholder communication.' },
      { name: 'Decision → offer', detail: 'HubSpot describes the loop as "AI-accelerated": BrightHire for notes, AI for resume keyword matching — but states every decision-maker is a human.' },
    ],
    focus: ['SQL', 'Case study structure', 'Explaining an analysis out loud', 'Stakeholder communication'],
    traps: ['The published process is the real process — being vague about your own funnel stage reads badly at a company this transparent.'],
    timeline: 'Response within 5 days of applying is the published commitment.',
    sources: ['https://www.hubspot.com/careers/how-we-hire', 'https://www.levels.fyi/companies/hubspot/salaries'],
  },
  {
    company: 'Datadog',
    hq: 'New York, NY',
    status: 'Public (DDOG), 8,100+ employees',
    sector: 'Observability — monitoring and security platform',
    careersUrl: 'https://www.datadoghq.com/careers',
    rounds: 6,
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst median total comp $190K = base $150K + stock $40K. 4-year vest, 25% cliff then 6.25% quarterly.`,
    loop: [
      { name: 'Recruiter screen', detail: 'Standard.' },
      { name: 'Technical, 1–2 rounds', detail: 'CoderPad. SQL against a real schema — the first job is to find the primary key and the join path, then write the query. Schema reasoning is weighted above SQL syntax.' },
      { name: 'Onsite panel', detail: 'Datadog tells candidates one round must be in person.' },
      { name: 'Behavioral', detail: 'Documented question: "Tell me a time when you were working with someone where the requirements were unclear and how did you validate what you were building was correct?"' },
    ],
    focus: ['Schema reasoning before SQL', 'Time-series and window functions', 'Validating work under unclear requirements', 'Cross-functional work with PMs'],
    traps: [
      'Low energy loses this loop. A public write-up describes an interviewer wanting to go deeper, the candidate stumbling, and the round being ended on the spot.',
      'Their own /candidate-experience page 404s — do not prep from a cached version of it.',
    ],
    timeline: 'Not documented. Comparable public SaaS median is 3–4 weeks.',
    sources: [
      'https://safereddit.com/r/cscareerquestions/comments/1pl1x4i/',
      'https://www.datadoghq.com/careers',
      'https://www.levels.fyi/companies/datadog/salaries/data-analyst',
    ],
  },
  {
    company: 'CarGurus',
    hq: 'Cambridge, MA',
    status: 'Public (CARG)',
    sector: 'Auto marketplace',
    careersUrl: 'https://careers.cargurus.com/',
    rounds: 5,
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst $140K–$162K common range.`,
    loop: [
      { name: 'Recruiter phone', length: '30 min', detail: 'Standard screen.' },
      { name: 'Hiring manager phone', detail: 'Behavioral plus one mini technical.' },
      { name: 'In-office technical, 3 parts', detail: 'SQL, statistics, analytical reasoning; case or live coding. This round is on site in Cambridge.' },
      { name: 'Stakeholder behavioral ×2', detail: 'One with Sales, one with Engineering.' },
    ],
    focus: ['SQL', 'Statistics and A/B test interpretation', 'Data visualisation', 'Cross-functional communication'],
    traps: ['A published question: an A/B test returns p = .04 — judge whether the result is valid. Answering "significant, ship it" fails it.'],
    sources: ['https://careers.cargurus.com/', 'https://www.levels.fyi/companies/cargurus/salaries'],
    caution: 'Cambridge on-site round — a genuine advantage from Northeastern, and a reason to prioritise it.',
  },
  {
    company: 'Wayfair',
    hq: 'Boston, MA',
    status: 'Public (W), 7,000+ employees',
    sector: 'E-commerce, home goods',
    careersUrl: 'https://www.wayfair.com/careers',
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst L2 $137K, L3 $168K.`,
    loop: [
      { name: 'Recruiter screen', detail: 'Standard.' },
      { name: 'Technical, 1–2 rounds', detail: 'SQL plus an Excel-based case, sometimes Python. The case is time-pressured.' },
      { name: 'Stakeholder / behavioral ×2', detail: 'Pricing, revenue and operational decision framing.' },
      { name: 'Final', detail: '—' },
    ],
    focus: ['SQL', 'Excel case under time pressure', 'Pricing and revenue reasoning'],
    traps: ['Technical depth exceeds what the title suggests. Preparing only Python and skipping Excel is the documented mistake.'],
    sources: ['https://www.wayfair.com/careers', 'https://www.levels.fyi/companies/wayfair/salaries'],
  },
  {
    company: 'DraftKings',
    hq: 'Boston, MA',
    status: 'Public (DKNG)',
    sector: 'Sports betting platform',
    careersUrl: 'https://careers.draftkings.com/',
    rounds: 4,
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst is junior-weighted — L9 $105K, L10 $93K. Public data is thin.`,
    loop: [
      { name: 'HR screen', detail: 'Standard.' },
      { name: 'Analytics manager case ×1–2', detail: 'Estimation and probability prompts — bowling-prize odds, train problems. Structured thinking on ambiguous problems is the stated axis.' },
      { name: 'Onsite', detail: 'Sometimes.' },
    ],
    focus: ['Estimation under ambiguity', 'Probability', 'Thinking out loud'],
    traps: ['They have explicitly said they dislike silent problem-solving. Narrate.'],
    sources: ['https://careers.draftkings.com/', 'https://www.levels.fyi/companies/draftkings/salaries'],
    caution: 'Boston HQ, not Las Vegas — a commutable target.',
  },
  {
    company: 'Toast',
    hq: 'Boston, MA',
    status: 'Public (TOST)',
    sector: 'Restaurant POS / SaaS',
    careersUrl: 'https://careers.toasttab.com/',
    rounds: 5,
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Analyst $126K–$148K common range.`,
    loop: [
      { name: 'Recruiter', length: '30 min', detail: 'Standard.' },
      { name: 'Technical assessment', length: '1 week', detail: 'Case or take-home.' },
      { name: 'Walkthrough with hiring manager', detail: 'You present the assessment.' },
      { name: 'Stakeholder interviews ×1–2', detail: '—' },
    ],
    focus: ['SQL', 'Python', 'Statistics', 'Restaurant-industry familiarity'],
    traps: ['The JD explicitly names operations systems — Salesforce, NetSuite, Zuora, RevPro. Not knowing what they are is a visible gap.'],
    sources: ['https://careers.toasttab.com/', 'https://www.levels.fyi/companies/toast/salaries'],
  },
  {
    company: 'Glean',
    hq: 'Palo Alto, CA',
    status: 'Private, ~$7B+, Series F 2026',
    sector: 'Enterprise Work AI — unified search, assistants, agents',
    careersUrl: 'https://www.glean.com/careers',
    rounds: 3,
    evidence: 'inferred',
    comp: `levels.fyi ${T}: very wide band — Solution Architect (India) $62K to SWE Manager (US) $1M. 4-year vest.`,
    loop: [
      { name: 'Recruiter screen', detail: 'Inferred.' },
      { name: 'Take-home (system design lite)', detail: 'Inferred from the public JD.' },
      { name: 'Onsite loop', detail: 'For an Applied AI / analyst role, expect LLM evaluation, prompt design, retrieval relevance measurement, and A/B testing of search-ranking changes.' },
    ],
    focus: ['Retrieval relevance measurement', 'LLM evaluation design', 'Permissions-aware search reasoning', 'Ranking experiments'],
    traps: ['No public interview write-up exists. Treat every round above as a preparation hypothesis, not a schedule.'],
    timeline: 'Not documented. Comparable AI startups: 3–5 weeks.',
    sources: [
      'https://safereddit.com/r/csMajors/comments/1p0mjzz/swe_summer_2026_rippling_vs_glean_intern/',
      'https://www.levels.fyi/companies/glean/salaries',
      'https://www.glean.com/careers',
    ],
    caution: 'One public thread flags a commercial risk: Glean may be constrained by Salesforce/Slack data-sharing rules. Worth a question in the loop, asked neutrally.',
  },
  {
    company: 'Harvey AI',
    hq: 'San Francisco, CA',
    status: 'Private, ~$11B valuation (Feb 2026 raise, $200M)',
    sector: 'Legal AI — law firms and corporate legal teams, 200,000+ professionals',
    careersUrl: 'https://www.harvey.ai/careers',
    rounds: 3,
    evidence: 'inferred',
    comp: `levels.fyi ${T}: BD $153K to SWE $492K. Data Scientist average $330K–$386K. Base for Senior DS $145K–$210K. Hybrid, 3 days in office.`,
    loop: [
      { name: 'Recruiter', detail: 'Inferred.' },
      { name: 'Take-home — legal RAG case', detail: 'Inferred from the JD: retrieval over 10K+ page contracts, hallucination mitigation, citation accuracy.' },
      { name: 'Onsite, ~5 rounds', detail: 'Inferred.' },
    ],
    focus: ['Retrieval over very long documents', 'Hallucination mitigation', 'Citation accuracy', 'Legal domain empathy'],
    traps: [
      'The co-founder is a former lawyer. Expect to be asked what question a lawyer would ask — domain empathy is the filter.',
      'Likely trap: "if a lawyer using your tool misses a clause, how is liability apportioned?"',
      'Harvey hires senior. A new-grad application here is a long shot; treat it as a stretch bet, not a base-case target.',
    ],
    sources: [
      'https://www.harvey.ai/careers',
      'https://www.levels.fyi/companies/harvey/salaries',
      'https://www.forbes.com/sites/ainamartinen/2026/02/09/legal-ai-startup-harvey-in-talks-to-raise-200-million-at-11-billion-valuation/',
    ],
    caution: 'No public interview write-up found at all. Everything above is reconstruction.',
  },
  {
    company: 'Cursor (Anysphere)',
    hq: 'San Francisco, CA',
    status: 'Private — a SpaceX acquisition was in progress through 2026',
    sector: 'AI code editor (VS Code fork)',
    careersUrl: 'https://cursor.com/careers',
    evidence: 'partial',
    loop: [
      { name: 'Multi-round loop, 4–5+', detail: 'A first-hand account from an Enterprise AE calls the process "grueling" and describes heading into a final round after several stages. No SWE or analyst write-up was found.' },
    ],
    focus: ['Whether you actually daily-drive AI tools', 'Activation, retention, conversion to Pro', 'Code-suggestion acceptance rate as a metric'],
    traps: [
      'Acceptance rate is a trap metric — it rises when suggestions get shorter and safer. Say that before they ask.',
      'Equity risk is real: a public comment notes there is almost certainly no accelerated vesting clause for a liquidity event, so an acquisition can hollow out a grant.',
    ],
    sources: [
      'https://safereddit.com/r/techsales/comments/1ugk6uu/is_an_ae_role_at_cursor_still_worth_it/',
      'https://cursor.com/careers',
    ],
    caution: 'Heavy recent hiring plus an acquisition in progress means churn risk. Ask about team stability and vesting treatment before accepting anything.',
  },
  {
    company: 'Mercury',
    hq: 'San Francisco, CA',
    status: 'Private',
    sector: 'Banking platform for startups',
    careersUrl: 'https://mercury.com/careers',
    evidence: 'inferred',
    comp: `levels.fyi ${T}: Data Scientist $306K–$435K, common $347K–$395K. Note the widely-flagged 6-year vest with a 6-year cliff.`,
    loop: [
      { name: 'Recruiter', detail: 'Inferred.' },
      { name: 'SQL schema PR review', detail: 'From an SWE account: you review a schema pull request, find the design trade-offs and explain them. Plus an AI-assisted coding round.' },
      { name: 'Onsite ~4 rounds', detail: 'Inferred: SQL live, experiment design, product sense, behavioral.' },
    ],
    focus: ['Schema design judgement', 'B2B banking metrics — activation, retention, treasury/savings cross-sell'],
    traps: ['The vesting schedule is unusual and unfavourable. Read the grant document before negotiating.'],
    sources: ['https://mercury.com/careers', 'https://www.levels.fyi/companies/mercury/salaries'],
  },
  {
    company: 'Ramp',
    hq: 'New York, NY',
    status: 'Private',
    sector: 'Fintech — corporate cards and spend management',
    rounds: 5,
    careersUrl: 'https://ramp.com/careers',
    evidence: 'partial',
    comp: `levels.fyi ${T}: Data Scientist median $255K (base $155K + RSU $100K).`,
    loop: [
      { name: 'Application-level technical challenge', detail: 'A string/programming problem attached to the application itself. Passing it is a prerequisite, not a bonus.' },
      { name: 'Recruiter', detail: '—' },
      { name: 'Technical screen', detail: 'Real SQL / Python / R problems.' },
      { name: 'Onsite', detail: 'Technical plus behavioral, sometimes a take-home presentation.' },
    ],
    focus: ['Fraud and risk framing', 'SQL / Python', 'Possibly KYC and OFAC vocabulary'],
    traps: ['The challenge gates the application. Applying without solving it wastes the application.'],
    sources: ['https://ramp.com/careers', 'https://www.levels.fyi/companies/ramp/salaries'],
  },
  {
    company: 'Snowflake',
    hq: 'Bozeman MT / San Francisco / Boston office',
    status: 'Public (SNOW), 7,000+ employees',
    sector: 'Cloud data platform',
    careersUrl: 'https://www.snowflake.com/careers/',
    evidence: 'inferred',
    loop: [
      { name: 'Recruiter → SQL live → data-pipeline design lite → product case → cross-functional → final', detail: 'Inferred. A data-warehouse company sets a high SQL bar, often in its own dialect.' },
    ],
    focus: ['Advanced SQL', 'Data pipeline design', 'Credit consumption, query performance, data-sharing analytics'],
    traps: ['No public write-up found. The SQL bar is the part worth over-preparing.'],
    sources: ['https://www.snowflake.com/careers/'],
  },
  {
    company: 'Chewy',
    hq: 'Plantation, FL (large Boston presence)',
    status: 'Public (CHWY)',
    sector: 'Pet e-commerce',
    careersUrl: 'https://www.chewy.com/jobs',
    evidence: 'inferred',
    loop: [{ name: 'Recruiter → SQL screen → case → onsite', detail: 'Inferred. Case is likely Autoship subscription churn.' }],
    focus: ['Autoship retention', 'Category affinity', 'Customer-service cost analytics'],
    traps: ['No public write-up found.'],
    sources: ['https://www.chewy.com/jobs'],
  },
  {
    company: 'Liberty Mutual',
    hq: 'Boston, MA',
    status: 'Private, 45,000+ employees',
    sector: 'Property & casualty insurance',
    careersUrl: 'https://www.libertymutual.com/careers',
    evidence: 'inferred',
    loop: [{ name: 'Recruiter → SQL screen → assessment centre / HackerRank → panel ×3–4', detail: 'Inferred from how large insurers hire. Long and formal.' }],
    focus: ['Claims fraud detection', 'Underwriting risk analytics', 'Customer retention'],
    traps: ['Large-employer funnels are slow. Apply early and do not treat silence as rejection.'],
    sources: ['https://www.libertymutual.com/careers'],
  },
  {
    company: 'Fidelity',
    hq: 'Boston, MA',
    status: 'Private, 50,000+ employees',
    sector: 'Investment, retirement, wealth management',
    careersUrl: 'https://jobs.fidelity.com/',
    evidence: 'inferred',
    loop: [{ name: 'Recruiter → online assessment (numerical + SQL) → HireVue → panel ×3–4', detail: 'Inferred from how large financial employers hire.' }],
    focus: ['Portfolio analytics', 'AUM growth', 'Customer trading behaviour'],
    traps: ['A recorded HireVue round is likely. Practise speaking to a camera with no interviewer reaction.'],
    sources: ['https://jobs.fidelity.com/'],
  },
  {
    company: 'Wellington Management',
    hq: 'Boston, MA',
    status: 'Private, 2,500+ employees, $1T+ AUM',
    sector: 'Asset management',
    careersUrl: 'https://www.wellington.com/en/careers',
    evidence: 'inferred',
    loop: [{ name: 'Recruiter → technical ×2–3 with brain teasers → behavioral', detail: 'Inferred.' }],
    focus: ['Time-series analysis', 'Portfolio risk metrics'],
    traps: ['No public write-up found.'],
    sources: ['https://www.wellington.com/en/careers'],
  },
  {
    company: 'Rapid7',
    hq: 'Boston, MA',
    status: 'Public (RPD)',
    sector: 'Security analytics / vulnerability management',
    careersUrl: 'https://www.rapid7.com/careers',
    evidence: 'inferred',
    loop: [{ name: 'Not documented', detail: 'No public write-up found for analyst roles.' }],
    focus: ['Security analytics'],
    traps: ['Nothing public to prep against — lean on the JD.'],
    sources: ['https://www.rapid7.com/careers'],
  },
  {
    company: 'Vistaprint (Cimpress)',
    hq: 'Lexington, MA',
    status: 'Public (CMPR)',
    sector: 'Print and marketing services for SMBs',
    careersUrl: 'https://cimpress.com/careers',
    evidence: 'inferred',
    loop: [{ name: 'Not documented', detail: 'No public write-up found.' }],
    focus: ['SMB marketing analytics'],
    traps: ['Nothing public to prep against.'],
    sources: ['https://cimpress.com/careers'],
  },
];

/* ------------------------------------------------------------
   Work-authorisation timeline
   ------------------------------------------------------------
   Every entry carries its source. Nothing here is legal advice;
   individual cases go to a licensed immigration attorney and to
   the Northeastern ISSO.
   ------------------------------------------------------------ */

export interface VisaMilestone {
  window: string;
  title: string;
  what: string;
  action?: string;
  source?: string;
  severity: 'info' | 'act' | 'risk';
}

export const visaMilestones: VisaMilestone[] = [
  {
    window: '2026-08 (now)',
    title: 'OPT filing window opens',
    what: 'A December 2026 graduate can have the DSO recommend OPT in SEVIS starting 90 days before the program end date — around September 2026. USCIS typically takes 2–4 months on the I-765, so the target is an EAD in hand on or before graduation day.',
    action: 'Book the Northeastern ISSO appointment and confirm the DSO has entered the OPT recommendation in SEVIS. Prepare passport, photos and I-20 for the I-765.',
    source: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt',
    severity: 'act',
  },
  {
    window: '2026-09-15',
    title: 'F-1 "duration of status" is replaced by a fixed admission period',
    what: 'The DHS final rule published 2026-07-17 ("Establishing a Fixed Time Period of Admission and an Extension of Stay Procedure") takes effect. The old model — stay as long as you maintain status — ends. F-1 holders must track an Admit Until date and file an Extension of Stay.',
    action: 'Confirm with ISSO how the new rule changes his specific I-20 end date and whether an EOS filing is needed before any OPT or STEM OPT step.',
    source: 'https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant',
    severity: 'risk',
  },
  {
    window: '2026-10 → 2026-12',
    title: 'OPT receipt, then graduation',
    what: 'Once the I-765 receipt lands, the 12-month OPT window is live. Unemployment is capped at 90 days on initial OPT.',
    action: 'Verify any prospective employer is E-Verify registered and in good standing — without that, the 24-month STEM OPT extension cannot be approved later.',
    source: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt',
    severity: 'act',
  },
  {
    window: '2026-12',
    title: 'Confirm the STEM CIP code',
    what: 'The 24-month STEM OPT extension depends on the degree CIP code being on the STEM Designated Degree Program List. Northeastern MS Analytics is generally STEM-designated, but the CIP code on the I-20 is what governs.',
    action: 'Ask ISSO to confirm the exact CIP code printed on his I-20 and that it appears on the current DHS STEM list. Do this before relying on a 36-month runway.',
    severity: 'act',
  },
  {
    window: '2027-01 → 2027-02',
    title: 'Line up sponsors, including cap-exempt options',
    what: 'H-1B cap-exempt employers — universities, affiliated nonprofits, nonprofit research organisations, some hospitals — are not subject to the lottery. For a Boston-based candidate this is a genuinely large employer pool.',
    action: 'Build a parallel target list of cap-exempt Boston employers alongside the corporate list.',
    severity: 'info',
  },
  {
    window: '≈2027-03',
    title: 'FY2028 H-1B registration window',
    what: 'Based on the FY2027 pattern, registration runs roughly mid-March; USCIS publishes the actual dates in January or February. The employer files the registration and pays the $215 fee. Results usually land in April or May.',
    source: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-cap-season',
    severity: 'act',
  },
  {
    window: 'From FY2027 onward',
    title: 'Weighted selection makes salary level a lottery variable',
    what: 'USCIS moved to a beneficiary-centric weighted selection that weights entries by OEWS wage level — Level IV counts four times, Level I once. Entry-level analytics offers usually sit at OEWS Level I–II.',
    action: 'When negotiating, an offer that lands at Level II rather than Level I is worth more than the salary difference alone — it multiplies lottery odds. Raise this in negotiation as a concrete, checkable ask.',
    source: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-cap-season',
    severity: 'risk',
  },
  {
    window: '2027-04 → 2027-06',
    title: 'I-129 filing after selection',
    what: 'USCIS accepts the I-129 petition from April 1, within a 90-day window for cap-subject filings.',
    severity: 'info',
  },
  {
    window: 'Ongoing risk',
    title: 'The $100,000 H-1B payment',
    what: 'A September 2025 presidential proclamation attaches a $100,000 payment to certain H-1B petitions — the trigger is tied to consular notification, port-of-entry notification or pre-flight inspection. Staying in the US on a change of status, or working cap-exempt, can avoid the trigger entirely.',
    action: 'This is a material reason to prefer change-of-status over consular processing, and to take cap-exempt employers seriously. Confirm the current rule with an attorney before making a decision on it — this area is moving fast.',
    source: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations',
    severity: 'risk',
  },
  {
    window: '2027-10-01',
    title: 'FY2028 H-1B start date',
    what: 'An approved petition with change of status activates on October 1. Consular processing instead means a visa appointment abroad — and that is the path where the $100,000 payment can bite.',
    severity: 'info',
  },
  {
    window: 'Backstop',
    title: 'STEM OPT gives three lottery attempts',
    what: '12 months of OPT plus a 24-month STEM extension is a 36-month working runway, which covers roughly three H-1B lotteries. Unemployment allowance rises to 150 days total across the extension.',
    action: 'File the STEM extension I-765 within the 90 days before initial OPT expires. Missing that window forfeits the extension.',
    source: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt',
    severity: 'act',
  },
];

export const intelMeta = {
  generatedAt: T,
  companyCount: companyIntel.length,
  firsthandCount: companyIntel.filter(c => c.evidence === 'firsthand').length,
  sources: [
    'BurnR13_Interview_RealQuestions_2026-08-09.md',
    'BurnR03_Interview_Intel_2026-08-09.md',
    'BurnR2_02_LiveResearch_2026-08-09.md',
    'BurnR14_Comp_Visa_Negotiation_2026-08-09.md',
  ],
};

export default { companyIntel, visaMilestones, intelMeta };
