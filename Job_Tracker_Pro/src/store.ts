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
   Seed from screening research (22 companies / 50 roles / 31 bullets)
   ============================================================ */
import seedData from './seed';
import playbook from './seed2';

export interface JTPState extends AppState {
  hydrate: () => void;
  addJob: (j: Partial<JobApplication>) => string;
  updateJob: (id: string, patch: Partial<JobApplication>) => void;
  moveJob: (id: string, to: string, note?: string) => void;
  removeJob: (id: string) => void;
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
  setSettings: (patch: Partial<AppState['settings']>) => void;
  resetAll: () => void;
  loadBackup: (state: AppState) => boolean;
}

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

  // Roles -> JobApplications (wishlist stage, matched to companies by name prefix)
  const jobs: JobApplication[] = (s.jobs || []).map((r, i) => {
    const co = companies.find(c => r.company && c.name.toLowerCase().startsWith(r.company.toLowerCase().split(' ')[0]));    return {
      id: r.id || uid('job'), title: r.title || '', companyId: co?.id || companies[0]?.id || '',
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
    goals: playbook.goals, questions: playbook.questions,
    starStories: playbook.starStories, stages: DEFAULT_STAGES,
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
        const history = [...job.stageHistory, { from: job.status, to: to as never, at: t, note, source: 'manual' as const }];
        set(state => ({ jobs: state.jobs.map(j => j.id === id ? { ...j, status: to as never, stageHistory: history, updatedAt: t, lastTouchedAt: t } : j) }));
        get().addActivity('stage', `Moved "${job.title}" → ${to}`, id);
      },

      removeJob: (id) => {
        set(s => ({ jobs: s.jobs.filter(j => j.id !== id) }));
        get().addActivity('job', `Removed job ${id.slice(0, 8)}`, id);
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
        if (b.settings && typeof b.settings === 'object') {
          patch.settings = { ...get().settings, ...(b.settings as object) };
        }
        set({ ...patch, savedAt: now() } as never);
        get().addActivity('system', `Backup restored — ${(patch.jobs as unknown[] | undefined)?.length ?? 0} jobs`);
        return true;
      },
    }),
    {
      name: 'job-tracker-pro-v2',
      version: 4,
      // Bumping this version discards an older cached store so the
      // playbook seed (templates / questions / STAR / resumes) and the
      // real submitted-application state land.
      migrate: (persisted, from) => (from < 4 ? buildInitialState() : (persisted as AppState)),
    }
  )
);
