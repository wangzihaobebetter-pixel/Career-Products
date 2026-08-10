/* ============================================================
   Job Tracker Pro — Full entity models (spec §1.1–1.16)
   ============================================================ */

export type StageId =
  | 'wishlist' | 'researching' | 'applied' | 'phone_screen' | 'technical'
  | 'onsite' | 'final' | 'offer' | 'negotiating' | 'accepted'
  | 'rejected' | 'ghosted' | 'withdrawn';

export interface StageDef { id: StageId; label: string; color: string; }

export interface StageChange {
  from: StageId; to: StageId; at: string; note?: string; source: 'manual'|'auto'|'bulk'|'import';
}

export type Source = 'linkedin'|'indeed'|'wellfound'|'builtin'|'glassdoor'|'company_site'|'referral'|'cold'|'other';
export type RemoteType = 'onsite'|'hybrid'|'remote'|'anywhere';
export type JobType = 'full_time'|'part_time'|'contract'|'intern'|'temp';
export type Level = 'entry'|'mid'|'senior'|'staff'|'principal'|'lead'|'manager'|'ic';
export type Priority = 'low'|'medium'|'high'|'dream';

export interface JobApplication {
  id: string; title: string; companyId: string; sourceUrl?: string; source: Source;
  description?: string; requirements?: string[]; niceToHaves?: string[];
  location?: string; remoteType: RemoteType; jobType: JobType; level?: Level;
  department?: string; salaryMin?: number; salaryMax?: number; salaryCurrency?: string;
  equity?: string; postedDate?: string; closingDate?: string; jdKeywords?: string[];
  tags?: string[]; priority: Priority; fitScore?: number;
  status: StageId; stageHistory: StageChange[];
  appliedDate?: string; expectedResponseDate?: string; lastTouchedAt: string;
  resumeVersionId?: string; coverLetterId?: string; referrerContactId?: string;
  customFields?: Record<string, string|number|boolean>; archived?: boolean;
  createdAt: string; updatedAt: string;
}

export type CompanySize = '1-10'|'11-50'|'51-200'|'201-500'|'501-1000'|'1001-5000'|'5001+';
export type FundingStage = 'bootstrap'|'seed'|'series_a'|'series_b'|'series_c'|'series_d'|'series_e'|'series_f'|'ipo'|'acquired'|'public';
export type FollowStatus = 'not_following'|'following'|'on_watchlist'|'blacklisted';

export interface Company {
  id: string; name: string; domain?: string; logoUrl?: string; website?: string;
  industry?: string; size?: CompanySize; fundingStage?: FundingStage; hqLocation?: string;
  glassdoorRating?: number; mission?: string; values?: string; techStack?: string;
  products?: string; recentNews?: string[]; followStatus: FollowStatus;
  rank?: number; score?: number; maxScore?: number; tier?: string; priorityDays?: string;
  contactPrimary?: string; contactBackup?: string; angle?: string;
  notes?: string; contacts?: string[]; createdAt: string; updatedAt: string;
}

export type InterviewType = 'recruiter_call'|'hiring_manager'|'technical_phone'|'take_home_review'|'system_design'|'coding'|'behavioral'|'onsite'|'panel'|'final'|'reference_check'|'offer_call'|'informal_chat';
export type InterviewOutcome = 'pending'|'passed'|'failed'|'no_show'|'rescheduled'|'canceled';

export interface InterviewEvent {
  id: string; jobId: string; type: InterviewType;
  scheduledAt: string; durationMin?: number; timezone?: string;
  interviewerName?: string; interviewerTitle?: string; interviewerLinkedIn?: string;
  meetingLink?: string; location?: string; agenda?: string;
  prepChecklist?: { text: string; done: boolean }[]; prepNotes?: string;
  questionsAsked?: string[]; starStoriesUsed?: string[];
  selfScorecard?: { technical: number; communication: number; problemSolving: number; culture: number; overall: number };
  outcome: InterviewOutcome; outcomeNotes?: string; followUpSentAt?: string;
  createdAt: string; updatedAt: string;
}

export type ContactRelationship = 'recruiter'|'hiring_manager'|'teammate'|'referrer'|'alum'|'friend'|'event_met'|'cold';
export type ContactStatus = 'not_contacted'|'reached_out'|'engaged'|'intro_done'|'advocate'|'not_interested'|'unresponsive';

export interface Contact {
  id: string; companyId?: string; name: string; title?: string;
  email?: string; phone?: string; linkedinUrl?: string; twitterUrl?: string;
  relationship: ContactRelationship; warmth: number; status: ContactStatus;
  lastContactedAt?: string; nextFollowUpAt?: string;
  interactionLog?: { date: string; type: string; summary: string; sentiment: number }[];
  outreach?: string[]; notes?: string; createdAt: string; updatedAt: string;
}

export type TaskStatus = 'todo'|'in_progress'|'done'|'snoozed'|'canceled';
export type TaskPriority = 'low'|'medium'|'high'|'urgent';
export type TaskType = 'follow_up'|'send_thanks'|'submit_assessment'|'research'|'prep'|'book_travel'|'send_docs'|'custom';

export interface Task {
  id: string; title: string; description?: string; jobId?: string; contactId?: string;
  dueDate?: string; priority: TaskPriority; status: TaskStatus; type: TaskType;
  recurring?: { interval: 'daily'|'weekly'|'biweekly'|'monthly'; until?: string };
  reminder?: { channel: 'browser'|'in_app'; leadMinutes: number };
  completedAt?: string; createdAt: string; updatedAt: string;
}

export interface Note {
  id: string; parentType: 'job'|'company'|'contact'|'interview'|'general'; parentId: string;
  title?: string; body: string; pinned?: boolean; mentions?: string[]; tags?: string[];
  createdAt: string; updatedAt: string;
}

export interface ResumeVersion {
  id: string; label: string; type: 'base'|'tailored'; fileName?: string; mimeType?: string; sizeBytes?: number;
  blobKey?: string; parentVersionId?: string; targetJobId?: string; bulletsUsed?: string[];
  jdKeywordsMatched?: string[]; matchScore?: number; useCount: number; lastUsedAt?: string;
  notes?: string; createdAt: string; updatedAt: string;
}

export type Competency = 'leadership'|'technical'|'execution'|'strategy'|'communication'|'design'|'data'|'customer'|'financial'|'other';

export interface Bullet {
  id: string; text: string; competency: Competency; metrics?: string[]; tags?: string[];
  jobsUsedIn?: string[]; effectiveness?: number; createdAt: string; updatedAt: string;
}

export type OfferStatus = 'received'|'reviewing'|'countered'|'accepted'|'declined'|'expired'|'pending_internal';

export interface SalaryOffer {
  id: string; jobId: string; status: OfferStatus;
  baseSalary?: number; baseCurrency?: string; bonus?: number; bonusType?: 'signing'|'annual'|'performance';
  equityShares?: number; equityVesting?: string; equityCurrentValue?: number;
  benefits?: { health?: string; retirement?: string; pto?: string; parental?: string; learning?: string; other?: string[] };
  totalCompCash?: number; totalCompTotal?: number; expirationDate?: string;
  negotiationHistory?: { date: string; type: string; from?: string; to?: string; channel: string; message?: string }[];
  notes?: string; createdAt: string; updatedAt: string;
}

export type TemplateCategory = 'cold_outreach'|'referral_request'|'follow_up'|'thank_you'|'post_rejection'|'salary_negotiation'|'cover_letter'|'networking';

export interface EmailTemplate {
  id: string; name: string; category: TemplateCategory; subject: string; body: string;
  mergeFields?: string[]; tags?: string[]; useCount: number; lastUsedAt?: string;
  createdAt: string; updatedAt: string;
}

export type OutreachStatus = 'draft'|'scheduled'|'sent'|'replied'|'bounced'|'no_reply'|'unsubscribed';

export interface Outreach {
  id: string; contactId: string; templateId: string; jobId?: string;
  sequenceStep: number; status: OutreachStatus; subject?: string; body?: string;
  scheduledAt?: string; sentAt?: string; repliedAt?: string; bouncedAt?: string;
  followUpDueAt?: string; notes?: string; createdAt: string; updatedAt: string;
}

export interface SavedSearch {
  id: string; name: string; query?: string; filters?: Record<string, unknown>;
  alertEnabled?: boolean; alertFrequency?: 'instant'|'daily'|'weekly';
  lastRunAt?: string; lastResultCount?: number; newSinceLastView?: string[];
  createdAt: string; updatedAt: string;
}

export type GoalMetric = 'applications_sent'|'interviews_completed'|'offers_received'|'networking_conversations'|'follow_ups_sent';

export interface Goal {
  id: string; period: 'week'|'month'|'quarter'; metric: GoalMetric;
  target: number; startDate: string; endDate: string; createdAt: string; updatedAt: string;
}

export interface Question {
  id: string; text: string; type: 'behavioral'|'technical'|'system_design'|'coding'|'case'|'culture';
  competency?: Competency; company?: string; jobId?: string; myAnswer?: string; starStoryId?: string;
  difficulty?: number; notes?: string; createdAt: string; updatedAt: string;
}

export interface StarStory {
  id: string; title: string; situation: string; task: string; action: string; result: string;
  competencies: Competency[]; metrics?: string[]; tags?: string[]; jobsUsedIn?: string[];
  effectiveness?: number; createdAt: string; updatedAt: string;
}

export interface AppSettings {
  name: string; email: string; targetRole: string; targetComp: string; relocate: boolean;
  theme: 'light'|'dark'|'system'; defaultCurrency: string; timezone: string;
  weekStart: 'sun'|'mon'; dateFormat: string; accentColor: string;
  quietHours: { start: string; end: string }; notificationsEnabled: boolean;
}

export interface AppState {
  version: number;
  companies: Company[];
  jobs: JobApplication[];
  interviews: InterviewEvent[];
  contacts: Contact[];
  tasks: Task[];
  notes: Note[];
  resumes: ResumeVersion[];
  bullets: Bullet[];
  offers: SalaryOffer[];
  templates: EmailTemplate[];
  outreach: Outreach[];
  savedSearches: SavedSearch[];
  goals: Goal[];
  questions: Question[];
  starStories: StarStory[];
  stages: StageDef[];
  settings: AppSettings;
  activity: { id: string; at: string; type: string; summary: string; entityId?: string }[];
  savedAt: string;
}
