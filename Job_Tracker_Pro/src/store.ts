import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StageId, AppState, JobApplication, Company, StageDef, Contact, InterviewEvent, Task, Note, EmailTemplate, Question, StarStory, SalaryOffer, Outreach, Goal, SavedSearch, ResumeVersion } from './types';

/* ============================================================
   Default stages (spec §1.2) — customizable in Settings
   ============================================================ */
export const DEFAULT_STAGES: StageDef[] = [
  { id: 'wishlist',    label: 'Wishlist',    color: '#64748b' },
  { id: 'researching', label: 'Researching', color: '#8b5cf6' },
  { id: 'applied',     label: 'Applied',     color: '#4f8bff' },
  { id: 'phone_screen',label: 'Phone Screen',color: '#0ea5e9' },
  { id: 'technical',   label: 'Technical',   color: '#f59e0b' },
  { id: 'onsite',      label: 'Onsite',      color: '#f97316' },
  { id: 'final',       label: 'Final',       color: '#ec4899' },
  { id: 'offer',       label: 'Offer',       color: '#34d399' },
  { id: 'negotiating', label: 'Negotiating', color: '#10b981' },
  { id: 'accepted',    label: 'Accepted',    color: '#22c55e' },
  { id: 'rejected',    label: 'Rejected',    color: '#ef4444' },
  { id: 'ghosted',     label: 'Ghosted',     color: '#6b7280' },
  { id: 'withdrawn',   label: 'Withdrawn',   color: '#9ca3af' },
];

/* Which pipeline stage each interview round implies (spec §3.4).
   Rounds not listed here (informal_chat, reference_check, offer_call)
   deliberately do not move the pipeline on their own. */
export const INTERVIEW_STAGE: Record<string, StageId | undefined> = {
  recruiter_call: 'phone_screen',
  technical_phone: 'phone_screen',
  hiring_manager: 'phone_screen',
  take_home_review: 'technical',
  coding: 'technical',
  system_design: 'technical',
  behavioral: 'technical',
  onsite: 'onsite',
  panel: 'onsite',
  final: 'final',
};
export const CLOSED_STAGES = ['accepted', 'rejected', 'ghosted', 'withdrawn'];

const now = () => new Date().toISOString();
let counter = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${++counter}`;

/* ============================================================
   Undo stack (spec P0 #17).

   Deliberately in memory only and deliberately shallow: it holds the
   previous value of just the arrays a mutation touched. Persisting it
   would mean a reload could "undo" work from a previous session, which
   is worse than losing the undo — so it dies with the tab. Depth is
   capped because each entry pins a whole array in memory.
   ============================================================ */
type UndoPatch = Partial<Pick<AppState, 'jobs' | 'companies' | 'contacts' | 'interviews' | 'tasks' | 'offers' | 'stages'>>;
interface UndoEntry { label: string; patch: UndoPatch }

const UNDO_DEPTH = 25;
const undoStack: UndoEntry[] = [];

function pushUndo(label: string, patch: UndoPatch): void {
  undoStack.push({ label, patch });
  if (undoStack.length > UNDO_DEPTH) undoStack.shift();
}

/** Test hook: lets the verifier assert the stack is actually empty/filled. */
export const _undoDepth = () => undoStack.length;

/* ============================================================
   Seed from screening research (22 companies / 50 roles / 31 bullets)
   ============================================================ */
import seedData from './seed';
import playbook from './seed2';
import { researchQuestions } from './seed3';

export interface JTPState extends AppState {
  hydrate: () => void;
  addJob: (j: Partial<JobApplication>) => string;
  updateJob: (id: string, patch: Partial<JobApplication>) => void;
  moveJob: (id: string, to: string, note?: string) => void;
  removeJob: (id: string) => void;
  bulkMove: (ids: string[], to: string) => number;
  bulkTag: (ids: string[], tag: string) => number;
  bulkArchive: (ids: string[], archived: boolean) => number;
  bulkRemove: (ids: string[]) => number;
  setStages: (stages: StageDef[]) => void;
  undoLast: () => string | null;
  undoLabel: () => string | null;
  addCompany: (c: Partial<Company>) => string;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  removeCompany: (id: string) => void;
  addContact: (c: Partial<Contact>) => string;
  addInterview: (i: Partial<InterviewEvent>) => string;
  addTask: (t: Partial<Task>) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addGoal: (g: Partial<Goal>) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addSavedSearch: (x: Partial<SavedSearch>) => string;
  removeSavedSearch: (id: string) => void;
  addNote: (n: Partial<Note>) => string;
  addTemplate: (t: Partial<EmailTemplate>) => string;
  addQuestion: (x: Partial<Question>) => string;
  addStory: (s: Partial<StarStory>) => string;
  addResume: (r: Partial<ResumeVersion>) => string;
  updateResume: (id: string, patch: Partial<ResumeVersion>) => void;
  removeResume: (id: string) => void;
  addOffer: (o: Partial<SalaryOffer>) => string;
  updateOffer: (id: string, patch: Partial<SalaryOffer>) => void;
  removeOffer: (id: string) => void;
  updateInterview: (id: string, patch: Partial<InterviewEvent>) => void;
  removeInterview: (id: string) => void;
  logInterviewOutcome: (id: string, outcome: InterviewEvent['outcome'], notes?: string) => void;
  addOutreach: (o: Partial<Outreach>) => string;
  addActivity: (type: string, summary: string, entityId?: string) => void;
  togglePlanCheck: (id: string) => void;
  resetPlanChecks: () => void;
  setSettings: (patch: Partial<AppState['settings']>) => void;
  resetAll: () => void;
  loadBackup: (state: AppState) => boolean;
  previewResearch: (raw: unknown) => ResearchPreview;
  importResearch: (raw: unknown, selectedKeys?: string[]) => ResearchImportResult;
}

/* Research files are machine-written and vary in quality: some rows are real
   postings, some are role *categories*. Nothing gets into the pipeline until
   the user has seen it, so the import is preview → select → commit. */
export interface ResearchPreviewJob {
  key: string; company: string; title: string;
  location?: string; salaryMin?: number; salaryMax?: number; fitScore?: number;
  duplicate: boolean; newCompany: boolean;
}
export interface ResearchPreview {
  ok: boolean; error?: string; source: string;
  jobs: ResearchPreviewJob[];
  newCompanies: string[];
  enrichCompanies: number;
  insights: number;
}

/* ============================================================
   Research import (schema produced by the corpus-analysis runs)
   ============================================================ */
export interface ResearchImportResult {
  ok: boolean;
  error?: string;
  companiesAdded: number;
  companiesEnriched: number;
  jobsAdded: number;
  jobsSkipped: number;
  insightsAdded: number;
}

export interface ResearchPayload {
  generatedAt?: string;
  sourceChunk?: string;
  companies?: {
    name?: string; domain?: string; tier?: number | string; industry?: string;
    stage?: string; hqLocation?: string; remotePolicy?: string;
    sponsorshipSignal?: string; whyRelevant?: string; sourceEvidence?: string;
  }[];
  jobs?: {
    company?: string; title?: string; location?: string; remoteType?: string;
    salaryMin?: number | null; salaryMax?: number | null; level?: string;
    applyUrl?: string; requirements?: string[]; fitScore?: number;
    fitReasoning?: string; sourceEvidence?: string;
  }[];
  insights?: { topic?: string; finding?: string; evidence?: string; actionable?: string }[];
}

/* Company names arrive from prose, so "Klaviyo, Inc." and "klaviyo" must
   collapse to one record. Strip legal suffixes and non-alphanumerics. */
const normName = (s: string) =>
  s.toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|technologies|labs|ai)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/* Research prose writes "Clipboard Health" where the tracker holds
   "Clipboard". Treat one as the other when the shorter name is a prefix of
   the longer and is distinctive enough that the collision is not accidental —
   8 characters keeps "Meta"/"Metabase" and "Notion"/"Notional" apart. */
const sameCompany = (a: string, b: string) => {
  const x = normName(a), y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 8 && long.startsWith(short);
};

const normTier = (t: unknown): string | undefined => {
  if (t == null) return undefined;
  const s = String(t).trim().toUpperCase();
  if (/^[123]$/.test(s)) return 'T' + s;
  if (/^T[123]$/.test(s)) return s;
  return undefined;
};

const REMOTE_TYPES = ['onsite', 'hybrid', 'remote'] as const;
const normRemote = (r: unknown): JobApplication['remoteType'] => {
  const s = String(r ?? '').toLowerCase();
  return (REMOTE_TYPES as readonly string[]).includes(s) ? (s as JobApplication['remoteType']) : 'remote';
};

/* Each research run emits its own ad-hoc shape, so an import that only
   understood one schema would reject almost every real file. When the
   canonical `companies`/`jobs` arrays are absent, walk the whole tree and
   harvest any object that *looks* like a role or a company. Recognition is
   deliberately strict — a wrong guess puts a fake role in the pipeline. */
const firstStr = (o: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim() && v.trim().length < 200) return v.trim();
  }
  return undefined;
};

const TITLE_KEYS = ['title', 'role', 'position', 'job_title', 'jobTitle', 'role_title'];
const COMPANY_KEYS = ['company', 'company_name', 'companyName', 'employer', 'org', 'organization'];
const NAME_KEYS = ['name', ...COMPANY_KEYS];

function harvest(raw: unknown): ResearchPayload {
  const jobs: NonNullable<ResearchPayload['jobs']> = [];
  const companies: NonNullable<ResearchPayload['companies']> = [];
  const seenJob = new Set<string>();
  const seenCo = new Set<string>();

  const walk = (node: unknown, depth: number) => {
    if (depth > 12 || node == null) return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, depth + 1)); return; }
    if (typeof node !== 'object') return;
    const o = node as Record<string, unknown>;

    const title = firstStr(o, TITLE_KEYS);
    const company = firstStr(o, COMPANY_KEYS);

    if (title && company) {
      const key = normName(company) + '|' + normName(title);
      if (!seenJob.has(key)) {
        seenJob.add(key);
        jobs.push({
          company, title,
          location: firstStr(o, ['location', 'city', 'office', 'hq', 'hqLocation']),
          remoteType: firstStr(o, ['remoteType', 'remote_type', 'remote', 'work_model']),
          applyUrl: firstStr(o, ['apply_url', 'applyUrl', 'url', 'link', 'job_url', 'posting_url']),
          level: firstStr(o, ['level', 'seniority', 'grade']),
          salaryMin: typeof o.salaryMin === 'number' ? o.salaryMin
                   : typeof o.salary_min === 'number' ? o.salary_min : null,
          salaryMax: typeof o.salaryMax === 'number' ? o.salaryMax
                   : typeof o.salary_max === 'number' ? o.salary_max : null,
          fitScore: typeof o.fitScore === 'number' ? o.fitScore
                  : typeof o.fit_score === 'number' ? o.fit_score : undefined,
          fitReasoning: firstStr(o, ['fitReasoning', 'fit_reasoning', 'verdict', 'why', 'rationale', 'notes']),
          requirements: Array.isArray(o.requirements) ? o.requirements.filter(x => typeof x === 'string') as string[]
                      : Array.isArray(o.verified_facts) ? o.verified_facts.filter(x => typeof x === 'string') as string[]
                      : undefined,
          sourceEvidence: firstStr(o, ['sourceEvidence', 'source_evidence', 'evidence', 'source']),
        });
      }
    } else if (!title) {
      /* A company record needs a name plus at least one company-ish signal,
         otherwise every {"name": ...} in the file becomes a company. */
      const name = firstStr(o, NAME_KEYS);
      const hasSignal = ['tier', 'score', 'industry', 'domain', 'website', 'hq', 'hqLocation',
                         'funding_stage', 'fundingStage', 'headcount'].some(k => o[k] != null);
      if (name && hasSignal && !seenCo.has(normName(name))) {
        seenCo.add(normName(name));
        companies.push({
          name,
          domain: firstStr(o, ['domain', 'website']),
          tier: (o.tier as number | string | undefined),
          industry: firstStr(o, ['industry', 'sector', 'category']),
          hqLocation: firstStr(o, ['hqLocation', 'hq', 'headquarters', 'location']),
          whyRelevant: firstStr(o, ['whyRelevant', 'why_relevant', 'angle', 'rationale', 'notes']),
        });
      }
    }

    Object.values(o).forEach(v => walk(v, depth + 1));
  };

  walk(raw, 0);
  return { companies, jobs };
}

/* One entry point for both the dry run and the commit, so the preview can
   never disagree with what the import actually does. */
function parseResearch(raw: unknown): { p: ResearchPayload; source: string } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const top = raw as ResearchPayload;
  const canonical = Array.isArray(top.companies) || Array.isArray(top.jobs);
  const p: ResearchPayload = canonical ? top : harvest(raw);
  if (!p.companies?.length && !p.jobs?.length) return null;
  const source = top.sourceChunk || (raw as Record<string, string>).source_file || 'research import';
  return { p, source };
}

/* Only accept a number that is a plausible annual USD salary. Corpus text
   yields "85" (meaning 85k) and stray years like 2026; the first is rescued,
   the second must not become a $2,026 salary. The 1000–9999 band is where
   years live, so it is dropped rather than guessed at. */
const normSalary = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n >= 10_000 && n <= 2_000_000) return n;   // already a full figure
  if (n >= 20 && n <= 999) return n * 1000;      // "85" → $85,000
  return undefined;                              // ambiguous → no claim
};

function buildInitialState(): AppState {
  const t = now();
  const s = seedData as unknown as { companies: Company[]; jobs: (Partial<JobApplication> & { company?: string })[]; bullets: { id: string; text: string; competency: string; createdAt: string }[] };

  // Companies from seed
  const companies: Company[] = (s.companies || []).map((c, i) => ({
    id: c.id || uid('co'), name: c.name, domain: c.domain, industry: c.industry,
    hqLocation: c.hqLocation, followStatus: c.followStatus || 'on_watchlist',
    rank: c.rank ?? i + 1, score: c.score, maxScore: c.maxScore || 50,
    tier: c.tier || 'T2', priorityDays: c.priorityDays || '14天内',
    contactPrimary: c.contactPrimary, contactBackup: c.contactBackup, angle: c.angle,
    notes: c.notes, createdAt: c.createdAt || t, updatedAt: c.updatedAt || t,
  }));

  /* Roles -> JobApplications. The screening pass produced roles at companies
     that never got a scored company record (Clipboard Health, CarGurus, …).
     Falling back to companies[0] silently filed those under Klaviyo, so a
     missing company is created here instead of guessed at. */
  const jobs: JobApplication[] = (s.jobs || []).map((r) => {
    let co = companies.find(c => r.company && sameCompany(c.name, r.company));
    if (!co && r.company) {
      co = {
        id: uid('co'), name: r.company, followStatus: 'on_watchlist',
        notes: 'Added automatically: roles were found for this company during screening.',
        createdAt: t, updatedAt: t,
      };
      companies.push(co);
    }
    return {
      id: r.id || uid('job'), title: r.title || '', companyId: co?.id || '',
      sourceUrl: r.sourceUrl, source: r.source || 'wellfound', description: r.description,
      location: r.location, remoteType: r.remoteType || 'remote', jobType: 'full_time',
      salaryMin: r.salaryMin, salaryMax: r.salaryMax, equity: r.equity,
      tags: r.tags, priority: 'medium', fitScore: r.fitScore,
      status: 'wishlist', stageHistory: [{ from: 'wishlist', to: 'wishlist', at: t, source: 'manual' }],
      lastTouchedAt: t, createdAt: t, updatedAt: t,
    };
  });

  /* Real submissions, from the application log — these are the only roles that
     have actually been sent. Everything else stays in Wishlist on purpose. */
  const SUBMITTED: { match: (j: JobApplication) => boolean; appliedDate: string; salaryMin: number; salaryMax: number }[] = [
    { match: j => j.id === 'job_1', appliedDate: '2026-08-09T18:06:00-04:00', salaryMin: 80000, salaryMax: 120000 },
  ];
  for (const sub of SUBMITTED) {
    const j = jobs.find(sub.match);
    if (!j) continue;
    j.status = 'applied';
    j.appliedDate = sub.appliedDate;
    j.salaryMin = sub.salaryMin;
    j.salaryMax = sub.salaryMax;
    j.priority = 'high';
    j.lastTouchedAt = sub.appliedDate;
    j.expectedResponseDate = new Date(new Date(sub.appliedDate).getTime() + 14 * 864e5).toISOString();
    j.stageHistory = [
      { from: 'wishlist', to: 'researching', at: sub.appliedDate, source: 'manual' },
      { from: 'researching', to: 'applied', at: sub.appliedDate, note: 'Submitted via Ashby — confirmation page verified', source: 'manual' },
    ];
  }

  // Notion role isn't in the screening roster (it was found separately) — add it as applied.
  const notionCo = companies.find(c => c.name === 'Notion');
  if (notionCo) {
    const at = '2026-08-09T18:09:00-04:00';
    jobs.unshift({
      id: 'job_notion_pa', title: 'People Analytics & Operations (Rotational Program)',
      companyId: notionCo.id,
      sourceUrl: 'https://jobs.ashbyhq.com/notion/e4229ca4-8210-4282-98ed-2071478f72aa',
      source: 'company_site', description:
        'Rotational program across People Analytics and People Operations. Applied with the canonical resume plus the GitHub portfolio link; Anchor Days answered Yes, sponsorship-now answered No (F-1 OPT).',
      location: 'San Francisco, CA', remoteType: 'hybrid', jobType: 'full_time',
      salaryMin: 85000, salaryMax: 124000, tags: ['Rotational', 'People Analytics', 'SF hybrid'],
      priority: 'high', fitScore: 8.6, status: 'applied', appliedDate: at,
      expectedResponseDate: new Date(new Date(at).getTime() + 14 * 864e5).toISOString(),
      stageHistory: [
        { from: 'wishlist', to: 'researching', at, source: 'manual' },
        { from: 'researching', to: 'applied', at, note: 'Submitted via Ashby — confirmation page verified', source: 'manual' },
      ],
      lastTouchedAt: at, createdAt: at, updatedAt: at,
    });
  }

  // Bullets
  const bullets = (s.bullets || []).map(b => ({
    id: b.id || uid('bl'), text: b.text, competency: (b.competency || 'execution') as never,
    createdAt: b.createdAt || t, updatedAt: b.createdAt || t,
  }));

  return {
    version: 2, companies, jobs, interviews: [],
    contacts: playbook.contacts, tasks: playbook.tasks, notes: [],
    resumes: playbook.resumes, bullets, offers: [],
    templates: playbook.templates, outreach: [], savedSearches: playbook.savedSearches,
    goals: playbook.goals,
    // Generic prep bank first, then the company-specific questions recovered
    // from the 2026-08-09 live research pass (see seed3.ts for sourcing).
    questions: [...playbook.questions, ...researchQuestions],
    starStories: playbook.starStories, stages: DEFAULT_STAGES,
    planChecks: {},
    settings: {
      // Left blank on purpose: this repo is public. Fill it in Settings —
      // it is stored only in this browser's localStorage, never in the repo.
      name: 'Zihao Wang', email: '',
      targetRole: 'Analytics / Product / AI', targetComp: '$100k+', relocate: true,
      theme: 'dark', defaultCurrency: 'USD', timezone: 'America/New_York',
      weekStart: 'mon', dateFormat: 'yyyy-MM-dd', accentColor: '#4f8bff',
      quietHours: { start: '22:00', end: '08:00' }, notificationsEnabled: false,
    },
    activity: [{ id: uid('act'), at: t, type: 'system', summary: 'Job Tracker Pro initialized with screening data' }],
    savedAt: t,
  };
}

export const useStore = create<JTPState>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      hydrate: () => { const s = get(); set({ ...s, savedAt: now() }); },

      addActivity: (type, summary, entityId) => {
        const s = get();
        set({ activity: [{ id: uid('act'), at: now(), type, summary, entityId }, ...s.activity].slice(0, 300) });
      },

      addJob: (j) => {
        const t = now(); const id = j.id || uid('job');
        const job: JobApplication = {
          id, title: j.title || 'Untitled role', companyId: j.companyId || '',
          source: j.source || 'other', remoteType: j.remoteType || 'remote', jobType: 'full_time',
          priority: j.priority || 'medium', status: j.status || 'wishlist',
          stageHistory: [{ from: 'wishlist', to: j.status || 'wishlist', at: t, source: 'manual' }],
          lastTouchedAt: t, createdAt: t, updatedAt: t, ...j,
        };
        set(s => ({ jobs: [job, ...s.jobs] }));
        get().addActivity('job', `Added job: ${job.title}`, id);
        return id;
      },

      updateJob: (id, patch) => {
        const t = now();
        set(s => ({ jobs: s.jobs.map(j => j.id === id ? { ...j, ...patch, updatedAt: t, lastTouchedAt: t } : j) }));
        get().addActivity('job', `Updated job ${id.slice(0, 8)}`, id);
      },

      moveJob: (id, to, note) => {
        const t = now(); const s = get();
        const job = s.jobs.find(j => j.id === id); if (!job) return;
        pushUndo(`Moved "${job.title}"`, { jobs: s.jobs });
        const history = [...job.stageHistory, { from: job.status, to: to as never, at: t, note, source: 'manual' as const }];
        set(state => ({ jobs: state.jobs.map(j => j.id === id ? { ...j, status: to as never, stageHistory: history, updatedAt: t, lastTouchedAt: t } : j) }));
        get().addActivity('stage', `Moved "${job.title}" → ${to}`, id);
      },

      removeJob: (id) => {
        const s = get();
        const job = s.jobs.find(j => j.id === id);
        pushUndo(`Deleted "${job?.title || 'job'}"`, { jobs: s.jobs });
        set(st => ({ jobs: st.jobs.filter(j => j.id !== id) }));
        get().addActivity('job', `Removed job ${id.slice(0, 8)}`, id);
      },

      /* ---- Bulk actions (spec P1 #30) --------------------------------
         One undo entry per bulk operation, not one per row — undoing a
         50-row move should be a single click, which is exactly why the
         snapshot is taken over the whole array rather than per job. */
      bulkMove: (ids, to) => {
        const t = now(); const s = get();
        const set_ = new Set(ids);
        const affected = s.jobs.filter(j => set_.has(j.id) && j.status !== to);
        if (!affected.length) return 0;
        pushUndo(`Moved ${affected.length} job${affected.length === 1 ? '' : 's'}`, { jobs: s.jobs });
        set(state => ({
          jobs: state.jobs.map(j => set_.has(j.id) && j.status !== to
            ? {
              ...j, status: to as never, updatedAt: t, lastTouchedAt: t,
              stageHistory: [...j.stageHistory, { from: j.status, to: to as never, at: t, source: 'bulk' as const }],
            }
            : j),
        }));
        get().addActivity('stage', `Bulk-moved ${affected.length} job(s) → ${to}`);
        return affected.length;
      },

      bulkTag: (ids, tag) => {
        const clean = tag.trim();
        if (!clean) return 0;
        const t = now(); const s = get();
        const set_ = new Set(ids);
        const affected = s.jobs.filter(j => set_.has(j.id) && !(j.tags || []).includes(clean));
        if (!affected.length) return 0;
        pushUndo(`Tagged ${affected.length} job${affected.length === 1 ? '' : 's'} "${clean}"`, { jobs: s.jobs });
        set(state => ({
          jobs: state.jobs.map(j => set_.has(j.id) && !(j.tags || []).includes(clean)
            ? { ...j, tags: [...(j.tags || []), clean], updatedAt: t }
            : j),
        }));
        get().addActivity('job', `Bulk-tagged ${affected.length} job(s) with "${clean}"`);
        return affected.length;
      },

      bulkArchive: (ids, archived) => {
        const t = now(); const s = get();
        const set_ = new Set(ids);
        const affected = s.jobs.filter(j => set_.has(j.id) && !!j.archived !== archived);
        if (!affected.length) return 0;
        pushUndo(`${archived ? 'Archived' : 'Unarchived'} ${affected.length} job${affected.length === 1 ? '' : 's'}`, { jobs: s.jobs });
        set(state => ({
          jobs: state.jobs.map(j => set_.has(j.id) ? { ...j, archived, updatedAt: t } : j),
        }));
        get().addActivity('job', `${archived ? 'Archived' : 'Unarchived'} ${affected.length} job(s)`);
        return affected.length;
      },

      bulkRemove: (ids) => {
        const s = get();
        const set_ = new Set(ids);
        const affected = s.jobs.filter(j => set_.has(j.id));
        if (!affected.length) return 0;
        pushUndo(`Deleted ${affected.length} job${affected.length === 1 ? '' : 's'}`, { jobs: s.jobs });
        set(state => ({ jobs: state.jobs.filter(j => !set_.has(j.id)) }));
        get().addActivity('job', `Bulk-deleted ${affected.length} job(s)`);
        return affected.length;
      },

      /* ---- Stage customization (spec P0 #16) -------------------------
         Renaming or reordering stages must never orphan a job, so ids
         are treated as immutable here: only label, colour and order can
         change, and any stage that still holds jobs cannot be dropped.
         The UI enforces that too, but the store is the last line. */
      setStages: (stages) => {
        const s = get();
        const kept = stages.filter(st => st && st.id);
        if (!kept.length) return;
        const keptIds = new Set(kept.map(st => st.id));
        const orphaned = s.jobs.filter(j => !keptIds.has(j.status as never));
        if (orphaned.length) return; // refuse rather than silently strand jobs
        pushUndo('Stage layout changed', { stages: s.stages });
        set({ stages: kept, savedAt: now() });
        get().addActivity('settings', `Stage layout updated (${kept.length} stages)`);
      },

      undoLabel: () => (undoStack.length ? undoStack[undoStack.length - 1].label : null),

      undoLast: () => {
        const entry = undoStack.pop();
        if (!entry) return null;
        set({ ...entry.patch, savedAt: now() } as never);
        get().addActivity('undo', `Undid: ${entry.label}`);
        return entry.label;
      },

      addCompany: (c) => {
        const t = now(); const id = c.id || uid('co');
        const company: Company = { id, name: c.name || 'Untitled', followStatus: 'following', createdAt: t, updatedAt: t, ...c };
        set(s => ({ companies: [company, ...s.companies] }));
        get().addActivity('company', `Added company: ${company.name}`, id);
        return id;
      },

      updateCompany: (id, patch) => {
        const t = now();
        set(s => ({ companies: s.companies.map(c => c.id === id ? { ...c, ...patch, updatedAt: t } : c) }));
      },

      removeCompany: (id) => {
        set(s => ({ companies: s.companies.filter(c => c.id !== id) }));
      },

      addContact: (c) => {
        const t = now(); const id = c.id || uid('ct');
        const contact: Contact = { id, name: c.name || 'Untitled', relationship: 'cold', warmth: 3, status: 'not_contacted', createdAt: t, updatedAt: t, ...c };
        set(s => ({ contacts: [contact, ...s.contacts] }));
        get().addActivity('contact', `Added contact: ${contact.name}`, id);
        return id;
      },

      addInterview: (i) => {
        const t = now(); const id = i.id || uid('iv');
        const iv: InterviewEvent = { id, jobId: i.jobId || '', type: 'recruiter_call', scheduledAt: i.scheduledAt || t, outcome: 'pending', createdAt: t, updatedAt: t, ...i };
        set(s => ({ interviews: [...s.interviews, iv] }));
        get().addActivity('interview', `Scheduled ${iv.type.replace(/_/g,' ')}`, id);

        /* Pipeline linkage: booking a round means the job has reached that
           round. Only ever move a job *forward* — never rewind someone who
           already got further, and never touch a closed application. */
        const job = get().jobs.find(j => j.id === iv.jobId);
        const target = INTERVIEW_STAGE[iv.type];
        if (job && target && !CLOSED_STAGES.includes(job.status)) {
          const order = DEFAULT_STAGES.map(s => s.id);
          if (order.indexOf(target) > order.indexOf(job.status)) {
            get().moveJob(job.id, target, `Auto-advanced: ${iv.type.replace(/_/g, ' ')} scheduled`);
          }
        }
        return id;
      },

      updateInterview: (id, patch) => {
        set(s => ({ interviews: s.interviews.map(i => i.id === id ? { ...i, ...patch, updatedAt: now() } : i) }));
      },

      removeInterview: (id) => {
        set(s => ({ interviews: s.interviews.filter(i => i.id !== id) }));
      },

      logInterviewOutcome: (id, outcome, notes) => {
        const iv = get().interviews.find(x => x.id === id); if (!iv) return;
        get().updateInterview(id, { outcome, outcomeNotes: notes });
        const job = get().jobs.find(j => j.id === iv.jobId);
        if (!job || CLOSED_STAGES.includes(job.status)) return;
        /* A failed round closes the application; a pass is left for the user
           to advance, because "passed" does not tell us which round is next. */
        if (outcome === 'failed') {
          get().moveJob(job.id, 'rejected', `Auto: ${iv.type.replace(/_/g, ' ')} outcome recorded as failed`);
        }
        get().addActivity('interview', `Outcome "${outcome}" on ${iv.type.replace(/_/g, ' ')}`, id);
      },

      addTask: (t) => {
        const n = now(); const id = t.id || uid('task');
        const task: Task = { id, title: t.title || 'Task', priority: 'medium', status: 'todo', type: 'custom', createdAt: n, updatedAt: n, ...t };
        set(s => ({ tasks: [task, ...s.tasks] }));
        get().addActivity('task', `Added task: ${task.title}`, id);
        return id;
      },

      updateTask: (id, patch) => {
        set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t) }));
      },

      toggleTask: (id) => {
        const t = get().tasks.find(x => x.id === id);
        if (!t) return;
        const done = t.status === 'done';
        get().updateTask(id, done
          ? { status: 'todo', completedAt: undefined }
          : { status: 'done', completedAt: now() });
        if (!done) get().addActivity('task', `Completed: ${t.title}`, id);
      },

      removeTask: (id) => {
        set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
      },

      addGoal: (g) => {
        const n = now(); const id = g.id || uid('goal');
        const goal: Goal = {
          id, period: g.period || 'week', metric: g.metric || 'applications_sent',
          target: g.target ?? 5, startDate: g.startDate || n, endDate: g.endDate || n,
          createdAt: n, updatedAt: n, ...g,
        };
        set(s => ({ goals: [...s.goals, goal] }));
        return id;
      },

      updateGoal: (id, patch) => {
        set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...patch, updatedAt: now() } : g) }));
      },

      removeGoal: (id) => {
        set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
      },

      addSavedSearch: (x) => {
        const n = now(); const id = x.id || uid('ss');
        const ss: SavedSearch = { id, name: x.name || 'Saved search', createdAt: n, updatedAt: n, ...x };
        set(s => ({ savedSearches: [...s.savedSearches, ss] }));
        return id;
      },

      removeSavedSearch: (id) => {
        set(s => ({ savedSearches: s.savedSearches.filter(x => x.id !== id) }));
      },

      addNote: (n) => {
        const t = now(); const id = n.id || uid('note');
        const note: Note = { id, parentType: n.parentType || 'general', parentId: n.parentId || '', body: n.body || '', createdAt: t, updatedAt: t, ...n };
        set(s => ({ notes: [note, ...s.notes] }));
        return id;
      },

      addTemplate: (t) => {
        const n = now(); const id = t.id || uid('tpl');
        const tpl: EmailTemplate = { id, name: t.name || 'Template', category: t.category || 'cold_outreach', subject: t.subject || '', body: t.body || '', useCount: 0, createdAt: n, updatedAt: n, ...t };
        set(s => ({ templates: [tpl, ...s.templates] }));
        get().addActivity('template', `Added template: ${tpl.name}`, id);
        return id;
      },

      addQuestion: (x) => {
        const t = now(); const id = x.id || uid('q');
        const q: Question = { id, text: x.text || '', type: x.type || 'behavioral', createdAt: t, updatedAt: t, ...x };
        set(s => ({ questions: [q, ...s.questions] }));
        return id;
      },

      addStory: (x) => {
        const t = now(); const id = x.id || uid('st');
        const st: StarStory = { id, title: x.title || 'Story', situation: '', task: '', action: '', result: '', competencies: ['execution'], createdAt: t, updatedAt: t, ...x };
        set(s => ({ starStories: [st, ...s.starStories] }));
        return id;
      },

      addResume: (r) => {
        const t = now(); const id = r.id || uid('rv');
        const rv: ResumeVersion = {
          id, label: r.label || 'Untitled version', type: r.type || 'tailored',
          useCount: 0, createdAt: t, updatedAt: t, ...r,
        };
        set(s => ({ resumes: [rv, ...s.resumes] }));
        get().addActivity('resume', `Saved resume version "${rv.label}"`, id);
        return id;
      },

      updateResume: (id, patch) => {
        set(s => ({ resumes: s.resumes.map(r => r.id === id ? { ...r, ...patch, updatedAt: now() } : r) }));
      },

      removeResume: (id) => {
        set(s => ({ resumes: s.resumes.filter(r => r.id !== id) }));
      },

      addOffer: (o) => {
        const t = now(); const id = o.id || uid('offer');
        const of: SalaryOffer = { id, jobId: o.jobId || '', status: 'received', createdAt: t, updatedAt: t, ...o };
        set(s => ({ offers: [...s.offers, of] }));
        get().addActivity('offer', `Recorded offer for job ${o.jobId?.slice(0,8)}`, id);
        return id;
      },

      updateOffer: (id, patch) => {
        set(s => ({ offers: s.offers.map(o => o.id === id ? { ...o, ...patch, updatedAt: now() } : o) }));
      },

      removeOffer: (id) => {
        set(s => ({ offers: s.offers.filter(o => o.id !== id) }));
      },

      addOutreach: (o) => {
        const t = now(); const id = o.id || uid('or');
        const or: Outreach = { id, contactId: o.contactId || '', templateId: o.templateId || '', sequenceStep: 1, status: 'draft', createdAt: t, updatedAt: t, ...o };
        set(s => ({ outreach: [...s.outreach, or] }));
        return id;
      },

      setSettings: (patch) => {
        set(s => ({ settings: { ...s.settings, ...patch } }));
      },

      /* Playbook ticks are stored as a flat id → bool map so that adding or
         renaming plan items never needs a data migration: an unknown id is
         simply absent, and a stale one is ignored by the view. */
      togglePlanCheck: (id) => {
        set(s => {
          const next = { ...(s.planChecks || {}) };
          if (next[id]) delete next[id]; else next[id] = true;
          return { planChecks: next };
        });
      },

      resetPlanChecks: () => {
        set({ planChecks: {} });
        get().addActivity('system', 'Playbook progress cleared');
      },

      resetAll: () => {
        const fresh = buildInitialState();
        set({ ...fresh });
        get().addActivity('system', 'Data reset to fresh state');
      },

      /* Returns false instead of throwing so the caller can show a message.
         A file that merely parses as JSON is not a backup — restoring one
         would silently wipe the pipeline, so check the shape first and only
         copy over keys we actually own. */
      loadBackup: (incoming) => {
        const b = incoming as unknown as Record<string, unknown>;
        if (!b || typeof b !== 'object') return false;
        const REQUIRED = ['companies', 'jobs', 'stages'] as const;
        if (REQUIRED.some(k => !Array.isArray(b[k]))) return false;

        const KEYS = [
          'companies', 'jobs', 'contacts', 'interviews', 'offers', 'resumes',
          'bullets', 'templates', 'questions', 'starStories', 'tasks', 'goals',
          'savedSearches', 'notes', 'outreach', 'activity', 'stages',
        ] as const;
        const patch: Record<string, unknown> = {};
        for (const k of KEYS) if (Array.isArray(b[k])) patch[k] = b[k];
        if (b.planChecks && typeof b.planChecks === 'object' && !Array.isArray(b.planChecks)) {
          patch.planChecks = b.planChecks;
        }
        if (b.settings && typeof b.settings === 'object') {
          patch.settings = { ...get().settings, ...(b.settings as object) };
        }
        set({ ...patch, savedAt: now() } as never);
        get().addActivity('system', `Backup restored — ${(patch.jobs as unknown[] | undefined)?.length ?? 0} jobs`);
        return true;
      },

      /* Dry run: report exactly what an import would do, changing nothing.
         The UI shows this and takes the user's selection before committing. */
      previewResearch: (raw) => {
        const empty = (error: string): ResearchPreview =>
          ({ ok: false, error, source: '', jobs: [], newCompanies: [], enrichCompanies: 0, insights: 0 });
        const parsed = parseResearch(raw);
        if (!parsed) return empty('No roles or companies found in this file — this is not a research export');
        const { p, source } = parsed;

        const existing = get().companies;
        const jobsNow = get().jobs;
        const pendingNew: string[] = [];
        const jobs: ResearchPreviewJob[] = [];
        const seen = new Set<string>();

        for (const rj of p.jobs || []) {
          const title = (rj.title || '').trim();
          const coName = (rj.company || '').trim();
          if (!title || !coName) continue;
          const key = normName(coName) + '|' + normName(title);
          if (seen.has(key)) continue;
          seen.add(key);
          const co = existing.find(c => sameCompany(c.name, coName));
          const isNewCo = !co && !pendingNew.some(n => sameCompany(n, coName));
          if (isNewCo) pendingNew.push(coName);
          jobs.push({
            key, company: co?.name || coName, title,
            location: rj.location || undefined,
            salaryMin: normSalary(rj.salaryMin), salaryMax: normSalary(rj.salaryMax),
            fitScore: typeof rj.fitScore === 'number' ? rj.fitScore : undefined,
            duplicate: !!co && jobsNow.some(j => j.companyId === co.id && normName(j.title) === normName(title)),
            newCompany: isNewCo,
          });
        }

        for (const rc of p.companies || []) {
          const name = (rc.name || '').trim();
          if (!name) continue;
          if (!existing.some(c => sameCompany(c.name, name)) && !pendingNew.some(n => sameCompany(n, name))) {
            pendingNew.push(name);
          }
        }

        return {
          ok: true, source, jobs, newCompanies: pendingNew,
          enrichCompanies: (p.companies || []).filter(rc =>
            rc.name && existing.some(c => sameCompany(c.name, rc.name!))).length,
          insights: (p.insights || []).filter(i => i.finding).length,
        };
      },

      /* Merge a research payload into the live pipeline.
         Additive only: an existing company or job is never overwritten, and
         nothing already in the pipeline changes stage. New roles land in
         Wishlist, because research is a lead, not an application.
         `selectedKeys`, when given, restricts the import to those roles. */
      importResearch: (raw, selectedKeys) => {
        const fail = (error: string): ResearchImportResult =>
          ({ ok: false, error, companiesAdded: 0, companiesEnriched: 0, jobsAdded: 0, jobsSkipped: 0, insightsAdded: 0 });

        const parsed = parseResearch(raw);
        if (!parsed) return fail('No roles or companies found in this file — this is not a research export');
        const { p, source } = parsed;
        const pick = selectedKeys ? new Set(selectedKeys) : null;

        const t = now();
        const companies = [...get().companies];
        const jobs = [...get().jobs];
        const notes: Note[] = [];
        let companiesAdded = 0, companiesEnriched = 0, jobsAdded = 0, jobsSkipped = 0;

        const findCo = (name: string, domain?: string) =>
          companies.find(c =>
            sameCompany(c.name, name) || (!!domain && !!c.domain && c.domain.toLowerCase() === domain.toLowerCase()));

        /* With a selection, a company only enters the tracker if one of the
           chosen roles needs it — a standalone company row is not a lead. */
        const wanted = pick
          ? new Set([...pick].map(k => k.split('|')[0]))
          : null;

        for (const rc of p.companies || []) {
          const name = (rc.name || '').trim();
          if (!name) continue;
          const existing = findCo(name, rc.domain);
          if (!existing && wanted && !wanted.has(normName(name))) continue;
          if (existing) {
            /* Fill only blanks — a field the user already curated wins. */
            const patch: Partial<Company> = {};
            if (!existing.domain && rc.domain) patch.domain = rc.domain;
            if (!existing.industry && rc.industry) patch.industry = rc.industry;
            if (!existing.hqLocation && rc.hqLocation) patch.hqLocation = rc.hqLocation;
            if (!existing.tier && normTier(rc.tier)) patch.tier = normTier(rc.tier);
            if (!existing.angle && rc.whyRelevant) patch.angle = rc.whyRelevant;
            if (Object.keys(patch).length) {
              const i = companies.findIndex(c => c.id === existing.id);
              companies[i] = { ...existing, ...patch, updatedAt: t };
              companiesEnriched++;
            }
          } else {
            companies.push({
              id: uid('co'), name, domain: rc.domain, industry: rc.industry,
              hqLocation: rc.hqLocation, followStatus: 'on_watchlist',
              tier: normTier(rc.tier), angle: rc.whyRelevant,
              notes: [rc.stage && `Stage: ${rc.stage}`, rc.remotePolicy && `Remote: ${rc.remotePolicy}`,
                      rc.sponsorshipSignal && `Sponsorship signal: ${rc.sponsorshipSignal}`,
                      rc.sourceEvidence && `Evidence: ${rc.sourceEvidence}`]
                .filter(Boolean).join('\n') || undefined,
              createdAt: t, updatedAt: t,
            });
            companiesAdded++;
          }
        }

        for (const rj of p.jobs || []) {
          const title = (rj.title || '').trim();
          const coName = (rj.company || '').trim();
          if (!title || !coName) { jobsSkipped++; continue; }
          if (pick && !pick.has(normName(coName) + '|' + normName(title))) { jobsSkipped++; continue; }

          let co = findCo(coName);
          if (!co) {
            co = { id: uid('co'), name: coName, followStatus: 'on_watchlist', createdAt: t, updatedAt: t };
            companies.push(co);
            companiesAdded++;
          }
          /* Same role at the same company is a duplicate, whatever the run. */
          const dupe = jobs.some(j => j.companyId === co!.id && normName(j.title) === normName(title));
          if (dupe) { jobsSkipped++; continue; }

          jobs.push({
            id: uid('job'), title, companyId: co.id,
            sourceUrl: rj.applyUrl || undefined, source: 'other',
            description: [rj.fitReasoning, rj.requirements?.length && `Requirements:\n- ${rj.requirements.join('\n- ')}`,
                          rj.sourceEvidence && `\nEvidence (${source}): ${rj.sourceEvidence}`]
              .filter(Boolean).join('\n\n') || undefined,
            location: rj.location || undefined, remoteType: normRemote(rj.remoteType), jobType: 'full_time',
            salaryMin: normSalary(rj.salaryMin), salaryMax: normSalary(rj.salaryMax),
            tags: rj.level ? [rj.level] : undefined,
            priority: (rj.fitScore ?? 0) >= 80 ? 'high' : 'medium',
            fitScore: typeof rj.fitScore === 'number' ? rj.fitScore : undefined,
            status: 'wishlist',
            stageHistory: [{ from: 'wishlist', to: 'wishlist', at: t, note: `Imported from ${source}`, source: 'import' }],
            lastTouchedAt: t, createdAt: t, updatedAt: t,
          });
          jobsAdded++;
        }

        for (const ins of p.insights || []) {
          const body = [ins.finding, ins.evidence && `Evidence: ${ins.evidence}`,
                        ins.actionable && `Action: ${ins.actionable}`].filter(Boolean).join('\n\n');
          if (!body) continue;
          notes.push({
            id: uid('note'), parentType: 'general', parentId: 'research',
            title: ins.topic || 'Research insight', body, tags: [source],
            createdAt: t, updatedAt: t,
          });
        }

        set(s => ({ companies, jobs, notes: [...notes, ...s.notes], savedAt: t }));
        get().addActivity('system',
          `Research imported from ${source} — +${jobsAdded} roles, +${companiesAdded} companies`);
        return { ok: true, companiesAdded, companiesEnriched, jobsAdded, jobsSkipped, insightsAdded: notes.length };
      },
    }),
    {
      name: 'job-tracker-pro-v2',
      version: 6,
      // Bumping this version discards an older cached store so the playbook
      // seed (templates / questions / STAR / resumes), the real submitted
      // -application state, the v5 company-attribution fix, and the v6
      // company-specific research question bank (seed3.ts) all land.
      migrate: (persisted, from) => (from < 6 ? buildInitialState() : (persisted as AppState)),
    }
  )
);
