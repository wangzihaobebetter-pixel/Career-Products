/* Unit tests for the two pure engines: JD matching and follow-up cadence.
   Run with: npm test   (bundles the TS with esbuild, then asserts.) */
import assert from 'node:assert/strict';
import { extractKeywords, matchBullets } from '../.testbuild/match.js';
import { computeFollowUps } from '../.testbuild/followups.js';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };

console.log('\nmatch.ts');

t('extracts skill keywords from a JD', () => {
  const kw = extractKeywords(`
    Requirements: 3+ years with SQL and Python. Experience with Tableau dashboards.
    Familiarity with machine learning and A/B testing is a plus.
  `);
  const terms = kw.map(k => k.term);
  for (const want of ['sql', 'python', 'tableau', 'machine learning', 'a/b testing']) {
    assert.ok(terms.includes(want), `expected keyword "${want}" in [${terms.slice(0, 15)}]`);
  }
});

t('weights requirements-block skills above body skills', () => {
  const kw = extractKeywords('Requirements: must know python. We also sometimes touch docker.');
  const py = kw.find(k => k.term === 'python');
  const dk = kw.find(k => k.term === 'docker');
  assert.equal(py.weight, 3);
  assert.ok(!dk || dk.weight <= 2);
});

t('drops generic words that appear only once', () => {
  const kw = extractKeywords('We value curiosity. Requirements: sql.');
  assert.ok(!kw.some(k => k.term === 'curiosity'));
});

t('empty JD yields no keywords and zero coverage', () => {
  assert.deepEqual(extractKeywords(''), []);
  const r = matchBullets('', [{ id: 'b1', text: 'Built a Python pipeline' }]);
  assert.equal(r.coverage, 0);
  assert.equal(r.bullets.length, 0);
});

t('ranks bullets by weighted keyword overlap', () => {
  const jd = 'Requirements: SQL, Python, Tableau. Nice to have: docker.';
  const r = matchBullets(jd, [
    { id: 'b1', text: 'Wrote SQL and Python to build Tableau dashboards for weekly reporting' },
    { id: 'b2', text: 'Managed a docker container' },
    { id: 'b3', text: 'Organised the team offsite' },
  ]);
  assert.equal(r.bullets[0].bulletId, 'b1');
  assert.ok(r.bullets[0].score > r.bullets[1].score);
  assert.ok(!r.bullets.some(b => b.bulletId === 'b3'), 'b3 has no overlap and must be excluded');
});

t('reports uncovered skills as gaps', () => {
  const r = matchBullets('Requirements: SQL and Kubernetes.', [{ id: 'b1', text: 'Wrote SQL queries' }]);
  const missing = r.missing.map(m => m.term);
  assert.ok(missing.includes('kubernetes'));
  assert.ok(!missing.includes('sql'));
});

t('coverage is 100 only when every skill keyword is covered', () => {
  const full = matchBullets('Requirements: sql.', [{ id: 'b1', text: 'Deep SQL work' }]);
  assert.equal(full.coverage, 100);
  const half = matchBullets('Requirements: sql and kubernetes.', [{ id: 'b1', text: 'Deep SQL work' }]);
  assert.ok(half.coverage > 0 && half.coverage < 100);
});

console.log('\nfollowups.ts');

const NOW = new Date('2026-08-09T12:00:00Z').getTime();
const DAY = 86400000;
const iso = (d) => new Date(NOW - d * DAY).toISOString();
const baseJob = (over) => ({
  id: 'j1', title: 'Analyst', companyId: 'c1', source: 'other', remoteType: 'remote',
  jobType: 'full_time', priority: 'medium', status: 'applied', stageHistory: [],
  lastTouchedAt: iso(0), createdAt: iso(0), updatedAt: iso(0), ...over,
});
const run = (over) => computeFollowUps({
  jobs: [], contacts: [], interviews: [], tasks: [],
  companyName: () => 'Acme', now: NOW, ...over,
});

t('a fresh application produces no nudge', () => {
  const s = run({ jobs: [baseJob({ lastTouchedAt: iso(1) })] });
  assert.equal(s.filter(x => x.kind === 'follow_up_application').length, 0);
});

t('an application silent past the stage threshold produces a nudge', () => {
  const s = run({ jobs: [baseJob({ lastTouchedAt: iso(9) })] });
  const n = s.find(x => x.id === 'nudge:j1');
  assert.ok(n, 'expected a nudge for a 9-day-silent applied role');
  assert.equal(n.kind, 'follow_up_application');
});

t('an application past the dead line asks to be closed, not nudged', () => {
  const s = run({ jobs: [baseJob({ lastTouchedAt: iso(40) })] });
  assert.ok(s.some(x => x.id === 'dead:j1'));
  assert.ok(!s.some(x => x.id === 'nudge:j1'), 'a dead application must not also be nudged');
});

t('an existing open task suppresses the duplicate nudge', () => {
  const s = run({
    jobs: [baseJob({ lastTouchedAt: iso(9) })],
    tasks: [{ id: 't1', title: 'follow up', jobId: 'j1', status: 'todo', priority: 'high', type: 'follow_up', createdAt: iso(0), updatedAt: iso(0) }],
  });
  assert.ok(!s.some(x => x.id === 'nudge:j1'));
});

t('closed applications are never nudged', () => {
  for (const status of ['rejected', 'accepted', 'withdrawn', 'ghosted']) {
    const s = run({ jobs: [baseJob({ status, lastTouchedAt: iso(60) })] });
    assert.equal(s.length, 0, `${status} should produce nothing`);
  }
});

t('a passed expected-response date is flagged separately', () => {
  const s = run({ jobs: [baseJob({ lastTouchedAt: iso(2), expectedResponseDate: iso(3) })] });
  assert.ok(s.some(x => x.id === 'expected:j1' && x.urgency === 'overdue'));
});

t('a same-day interview asks for a thank-you today', () => {
  const s = run({
    jobs: [baseJob({})],
    interviews: [{ id: 'i1', jobId: 'j1', type: 'onsite', scheduledAt: iso(0), outcome: 'pending', createdAt: iso(0), updatedAt: iso(0) }],
  });
  const th = s.find(x => x.id === 'thanks:i1');
  assert.ok(th);
  assert.equal(th.urgency, 'today');
});

t('a past interview still marked pending asks for an outcome', () => {
  const s = run({
    jobs: [baseJob({})],
    interviews: [{ id: 'i1', jobId: 'j1', type: 'onsite', scheduledAt: iso(4), outcome: 'pending', createdAt: iso(0), updatedAt: iso(0) }],
  });
  assert.ok(s.some(x => x.id === 'outcome:i1' && x.urgency === 'overdue'));
});

t('placeholder contacts are never nudged', () => {
  const s = run({
    contacts: [{ id: 'ct1', name: '[unfilled] Acme — Recruiter', relationship: 'cold', warmth: 3, status: 'reached_out', lastContactedAt: iso(10), createdAt: iso(0), updatedAt: iso(0) }],
  });
  assert.equal(s.length, 0, 'an empty placeholder slot has no one to follow up with');
});

t('a real contact who went quiet gets exactly one second touch', () => {
  const s = run({
    contacts: [{ id: 'ct1', name: 'Jamie', relationship: 'recruiter', warmth: 3, status: 'reached_out', lastContactedAt: iso(10), createdAt: iso(0), updatedAt: iso(0) }],
  });
  assert.equal(s.filter(x => x.contactId === 'ct1').length, 1);
});

t('overdue items sort ahead of today items', () => {
  const s = run({
    jobs: [baseJob({ id: 'j1', lastTouchedAt: iso(30) }), baseJob({ id: 'j2', lastTouchedAt: iso(8) })],
  });
  assert.equal(s[0].urgency, 'overdue');
});

console.log(`\n${pass} assertions passed\n`);
