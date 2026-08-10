/* ============================================================
   ICS (RFC 5545) export for interview events — spec P1 #29.

   Why hand-rolled: a calendar file is a text format with three
   rules that actually matter (CRLF line endings, escaping, and
   75-octet line folding). A dependency for that is not worth the
   supply-chain surface in a local-first app.
   ============================================================ */
import type { InterviewEvent, JobApplication, Company } from '../types';

/** RFC 5545 §3.3.5 — UTC form: 19980118T230000Z */
export function icsStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** RFC 5545 §3.3.11 — backslash, semicolon, comma, newline. */
export function icsEscape(v: string): string {
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** UTF-8 byte length of a single code point. */
function utf8Len(cp: string): number {
  const c = cp.codePointAt(0) as number;
  if (c < 0x80) return 1;
  if (c < 0x800) return 2;
  if (c < 0x10000) return 3;
  return 4;
}

/**
 * RFC 5545 §3.1 — fold at 75 **octets**, continuation lines start with a space.
 *
 * Counting characters instead of bytes is the classic bug here: one em dash in
 * a job title is 3 bytes, so a 75-character line can be 77 octets and strict
 * parsers reject it. Splitting is done per code point so a multi-byte
 * character is never cut in half.
 */
export function icsFold(line: string): string {
  const chars = Array.from(line);
  if (chars.reduce((n, c) => n + utf8Len(c), 0) <= 75) return line;

  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75; // first line: 75 octets; continuations: 1 space + 74

  for (const ch of chars) {
    const len = utf8Len(ch);
    if (bytes + len > limit) {
      out.push(cur);
      cur = ch;
      bytes = len;
      limit = 74;
    } else {
      cur += ch;
      bytes += len;
    }
  }
  if (cur) out.push(cur);

  return out[0] + (out.length > 1 ? '\r\n' + out.slice(1).map(s => ' ' + s).join('\r\n') : '');
}

const TYPE_LABEL: Record<string, string> = {
  recruiter_call: 'Recruiter call', hiring_manager: 'Hiring manager', technical_phone: 'Technical phone screen',
  take_home_review: 'Take-home review', system_design: 'System design', coding: 'Coding interview',
  behavioral: 'Behavioral interview', onsite: 'Onsite', panel: 'Panel', final: 'Final round',
  reference_check: 'Reference check', offer_call: 'Offer call', informal_chat: 'Informal chat',
};

export interface IcsContext {
  jobs: JobApplication[];
  companies: Company[];
}

export function eventSummary(iv: InterviewEvent, ctx: IcsContext): string {
  const job = ctx.jobs.find(j => j.id === iv.jobId);
  const co = job ? ctx.companies.find(c => c.id === job.companyId) : undefined;
  const who = co?.name || 'Interview';
  const label = TYPE_LABEL[iv.type] || iv.type.replace(/_/g, ' ');
  return job ? `${who} — ${label} (${job.title})` : `${who} — ${label}`;
}

function eventDescription(iv: InterviewEvent, ctx: IcsContext): string {
  const job = ctx.jobs.find(j => j.id === iv.jobId);
  const parts: string[] = [];
  if (job) parts.push(`Role: ${job.title}`);
  if (iv.interviewerName) parts.push(`Interviewer: ${iv.interviewerName}${iv.interviewerTitle ? ` (${iv.interviewerTitle})` : ''}`);
  if (iv.agenda) parts.push(`Agenda: ${iv.agenda}`);
  if (iv.prepChecklist?.length) {
    parts.push('Prep:');
    iv.prepChecklist.forEach(p => parts.push(`  ${p.done ? '[x]' : '[ ]'} ${p.text}`));
  }
  if (iv.prepNotes) parts.push(`Notes: ${iv.prepNotes}`);
  parts.push('', 'Exported from Job Tracker Pro (local-first).');
  return parts.join('\n');
}

/** Build a full VCALENDAR for the given interviews. Skips events with an unparseable date. */
export function buildICS(interviews: InterviewEvent[], ctx: IcsContext): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Job Tracker Pro//Interview Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const stampNow = icsStamp(new Date().toISOString());

  for (const iv of interviews) {
    const start = icsStamp(iv.scheduledAt);
    if (!start) continue;
    const dur = iv.durationMin && iv.durationMin > 0 ? iv.durationMin : 45;
    const end = icsStamp(new Date(new Date(iv.scheduledAt).getTime() + dur * 60000).toISOString());
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${iv.id}@job-tracker-pro.local`);
    lines.push(`DTSTAMP:${stampNow}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(icsFold(`SUMMARY:${icsEscape(eventSummary(iv, ctx))}`));
    lines.push(icsFold(`DESCRIPTION:${icsEscape(eventDescription(iv, ctx))}`));
    if (iv.meetingLink) lines.push(icsFold(`URL:${icsEscape(iv.meetingLink)}`));
    const loc = iv.meetingLink || iv.location;
    if (loc) lines.push(icsFold(`LOCATION:${icsEscape(loc)}`));
    lines.push(`STATUS:${iv.outcome === 'canceled' ? 'CANCELLED' : 'CONFIRMED'}`);
    // 24h and 1h reminders — spec §5.10 asks for both lead times.
    lines.push('BEGIN:VALARM', 'TRIGGER:-PT24H', 'ACTION:DISPLAY', 'DESCRIPTION:Interview tomorrow', 'END:VALARM');
    lines.push('BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Interview in 1 hour', 'END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** How many VEVENTs a calendar string contains — used by the verifier. */
export function countEvents(ics: string): number {
  return (ics.match(/BEGIN:VEVENT/g) || []).length;
}

export function downloadICS(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
