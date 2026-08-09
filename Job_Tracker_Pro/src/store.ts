import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, JobApplication, Company, StageDef, Contact, InterviewEvent, Task, Note, EmailTemplate, Question, StarStory, SalaryOffer, Outreach } from './types';

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
  addNote: (n: Partial<Note>) => string;
  addTemplate: (t: Partial<EmailTemplate>) => string;
  addQuestion: (x: Partial<Question>) => string;
  addStory: (s: Partial<StarStory>) => string;
  addOffer: (o: Partial<SalaryOffer>) => string;
  addOutreach: (o: Partial<Outreach>) => string;
  addActivity: (type: string, summary: string, entityId?: string) => void;
  setSettings: (patch: Partial<AppState['settings']>) => void;
  resetAll: () => void;
  loadBackup: (state: AppState) => void;
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
        return id;
      },

      addTask: (t) => {
        const n = now(); const id = t.id || uid('task');
        const task: Task = { id, title: t.title || 'Task', priority: 'medium', status: 'todo', type: 'custom', createdAt: n, updatedAt: n, ...t };
        set(s => ({ tasks: [task, ...s.tasks] }));
        get().addActivity('task', `Added task: ${task.title}`, id);
        return id;
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

      addOffer: (o) => {
        const t = now(); const id = o.id || uid('offer');
        const of: SalaryOffer = { id, jobId: o.jobId || '', status: 'received', createdAt: t, updatedAt: t, ...o };
        set(s => ({ offers: [...s.offers, of] }));
        get().addActivity('offer', `Recorded offer for job ${o.jobId?.slice(0,8)}`, id);
        return id;
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

      loadBackup: (state) => {
        set({ ...state, savedAt: now() });
        get().addActivity('system', 'Backup restored');
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
