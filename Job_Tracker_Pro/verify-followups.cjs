/* Unit test for the follow-up cadence engine and the shared goal-progress
   helper. The Dashboard shows an empty follow-up panel on fresh seed data
   (nothing has aged past its cadence yet) — which is correct, but it means
   the UI test cannot prove the engine works. This does. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '.tmp-followups.cjs');
execFileSync('npx', ['esbuild', 'src/lib/followups.ts', 'src/lib/goals.ts',
  '--bundle', '--format=cjs', '--platform=node', '--outdir=.tmp-lib', '--out-extension:.js=.cjs', '--log-level=error'],
  { cwd: __dirname, stdio: 'inherit' });

const { computeFollowUps, jobHealth } = require('./.tmp-lib/followups.cjs');
const { goalProgress } = require('./.tmp-lib/goals.cjs');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  PASS  ' + m + (d ? '  — ' + d : ''))) : (fail++, console.log('  FAIL  ' + m + (d ? '  — ' + d : ''))); };

const DAY = 86400000;
const NOW = Date.parse('2026-08-09T12:00:00Z');
const ago = d => new Date(NOW - d * DAY).toISOString();

const job = (id, status, daysIdle, extra = {}) => ({
  id, companyId: 'c1', title: 'Analyst', status,
  lastTouchedAt: ago(daysIdle),
  stageHistory: [{ to: status, at: ago(daysIdle) }],
  createdAt: ago(daysIdle), updatedAt: ago(daysIdle),
  appliedDate: status === 'applied' ? ago(daysIdle) : undefined,
  ...extra,
});

const base = { contacts: [], interviews: [], tasks: [], companyName: () => 'Klaviyo' };

// 1. a fresh application produces no nudge
let s = computeFollowUps({ ...base, jobs: [job('j1', 'applied', 1)], now: NOW });
ok(s.length === 0, 'fresh application (1 day) produces no nudge', s.length + ' suggestions');

// 2. an application silent past its 7-day cadence does
s = computeFollowUps({ ...base, jobs: [job('j2', 'applied', 9)], now: NOW });
ok(s.length > 0, 'application silent 9 days fires a nudge', s.length + ' suggestions');
ok(s.some(x => x.jobId === 'j2'), 'the nudge points at the right job');
ok(s[0] && typeof s[0].why === 'string' && s[0].why.length > 0, 'nudge explains the rule that fired', s[0] && s[0].why);

// 3. urgency escalates past 2x the threshold
s = computeFollowUps({ ...base, jobs: [job('j3', 'applied', 20)], now: NOW });
ok(s.some(x => x.urgency === 'overdue'), 'silent 20 days escalates to overdue', s.map(x => x.urgency).join(','));

// 4. a post-onsite silence is chased sooner than an applied one
const onsite = computeFollowUps({ ...base, jobs: [job('j4', 'onsite', 6)], now: NOW });
const applied = computeFollowUps({ ...base, jobs: [job('j5', 'applied', 6)], now: NOW });
ok(onsite.length > 0 && applied.length === 0, 'onsite silence chased sooner than applied silence', 'onsite ' + onsite.length + ' vs applied ' + applied.length);

// 5. closed applications are never nudged
s = computeFollowUps({ ...base, jobs: [job('j6', 'rejected', 90), job('j7', 'withdrawn', 90)], now: NOW });
ok(s.length === 0, 'rejected/withdrawn applications are never nudged', s.length + ' suggestions');

// 6. suggestion ids are stable across calls (so dismissing works)
const a = computeFollowUps({ ...base, jobs: [job('j8', 'applied', 12)], now: NOW }).map(x => x.id);
const b = computeFollowUps({ ...base, jobs: [job('j8', 'applied', 12)], now: NOW }).map(x => x.id);
ok(a.length > 0 && JSON.stringify(a) === JSON.stringify(b), 'suggestion ids are stable across calls', a[0]);

// 7. jobHealth agrees with the same patience table
ok(jobHealth(job('j9', 'applied', 2), NOW).level === 'ok', 'jobHealth: fresh application is ok');
ok(['stale', 'ghosting'].includes(jobHealth(job('j10', 'applied', 40), NOW).level), 'jobHealth: 40-day silence is not ok', jobHealth(job('j10', 'applied', 40), NOW).level);

// 8. goal progress counts only records inside the window
const gp = goalProgress('applications_sent', '2026-08-01', '2026-08-31', {
  jobs: [
    { appliedDate: '2026-08-05' }, { appliedDate: '2026-08-20' },
    { appliedDate: '2026-07-15' }, { appliedDate: undefined },
  ],
  interviews: [], offers: [], contacts: [], tasks: [],
});
ok(gp === 2, 'goalProgress counts only records inside the window', gp + ' of 4 jobs');

const gp2 = goalProgress('follow_ups_sent', '2026-08-01', '2026-08-31', {
  jobs: [], interviews: [], offers: [], contacts: [],
  tasks: [
    { type: 'follow_up', status: 'done', completedAt: '2026-08-04' },
    { type: 'follow_up', status: 'open', completedAt: '2026-08-04' },
    { type: 'prep', status: 'done', completedAt: '2026-08-04' },
  ],
});
ok(gp2 === 1, 'goalProgress ignores open tasks and other types', gp2 + ' of 3 tasks');

// 9. a record with no lastTouchedAt must not become silently immortal.
//    loadBackup restores arbitrary JSON without normalising it, so this is
//    reachable in practice, and NaN comparisons would report it as healthy.
const noStamp = { id: 'j11', companyId: 'c1', title: 'Analyst', status: 'applied',
  stageHistory: [{ to: 'applied', at: ago(40) }] };
ok(jobHealth(noStamp, NOW).daysIdle === 40,
   'missing lastTouchedAt falls back to stage history', jobHealth(noStamp, NOW).daysIdle + ' days idle');
ok(jobHealth(noStamp, NOW).level !== 'ok',
   'a 40-day silence without lastTouchedAt is still not healthy', jobHealth(noStamp, NOW).level);
const sNoStamp = computeFollowUps({ ...base, jobs: [noStamp], now: NOW });
ok(sNoStamp.length > 0, 'a job missing lastTouchedAt still gets nudged', sNoStamp.length + ' suggestions');

const noDatesAtAll = { id: 'j12', companyId: 'c1', title: 'Analyst', status: 'applied', stageHistory: [] };
ok(jobHealth(noDatesAtAll, NOW).level === 'stale',
   'a record with no usable date is flagged, not called healthy', jobHealth(noDatesAtAll, NOW).level);
ok(!/NaN/.test(JSON.stringify(jobHealth(noDatesAtAll, NOW))), 'no NaN leaks into the health report');

const garbage = { id: 'j13', companyId: 'c1', title: 'Analyst', status: 'applied',
  lastTouchedAt: 'not-a-date', stageHistory: [{ to: 'applied', at: ago(25) }] };
ok(jobHealth(garbage, NOW).daysIdle === 25, 'an unparseable lastTouchedAt falls through to the next timestamp',
   jobHealth(garbage, NOW).daysIdle + ' days idle');

fs.rmSync(path.join(__dirname, '.tmp-lib'), { recursive: true, force: true });
console.log('\n=== followups+goals: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
