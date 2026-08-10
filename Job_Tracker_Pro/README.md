# Job Tracker Pro

A local-first job-search workspace: pipeline tracking, mined live openings,
company research, a resume bullet library with JD matching, outreach sequences,
an interview question bank, and conversion statistics — one single-page app,
no server.

**Your data never leaves your machine.** Everything lives in your browser's
`localStorage` under `job-tracker-pro-v2`. No account, no backend, no analytics,
no network request at runtime.

---

## Run it

```bash
./run.sh            # build, serve on http://localhost:4173/, open the browser
./run.sh dev        # hot-reload dev server on http://localhost:5173/
./run.sh test       # type-check, build, and every verification suite
```

**Requirement:** Node.js (LTS) from <https://nodejs.org>. Nothing else.

### On a phone

Two ways, both real:

1. **Same Wi-Fi.** `./run.sh` binds `--host`, so the terminal prints a
   `Network:` URL like `http://10.0.0.4:4173/`. Open that on the phone.
2. **The published build.** The `app/` folder is a copy of `dist/` and is served
   by GitHub Pages, so any device with the URL can open it.

Each browser keeps its own `localStorage`, so the phone starts from the seeded
state, not from your laptop's data. To move real data across, use
`Settings → Export JSON` and import the file on the other device. This is a
deliberate limitation — see decision 2 below.

---

## What ships with it

Seeded from the August 2026 research corpus, so the app is useful the first time
it opens. Every number below is data that existed in a named source file; none
of it was written by hand to fill the screen.

- **51 roles** in the pipeline, only 2 marked `applied` — because only 2 were
  actually submitted.
- **32 companies** with scores, tiers, and a per-company research angle.
- **444 mined live openings**, each carrying the report file it came from and an
  HTTP link-check result.
- **980 interview questions**, filterable by company, type, and provenance, each
  with a coach note and a source tag.
- **60 outreach email templates** across 12 categories, with merge fields and
  alternate subject lines.
- **31 resume bullets** tagged by competency, used by the JD matcher.
- **18 contact slots** per target company (recruiter / hiring manager / alum) —
  names are yours to fill in.
- **A work-authorisation timeline** for an F-1 → OPT candidate: filing window,
  the status-duration rule change, receipt-to-graduation checkpoints.

---

## The 17 views

**Core** — Dashboard · Live Openings · Pipeline · Companies
**Network** — Contacts · Interviews · Offers
**Materials** — Resume & Bullets · Tailor to JD · Email Templates · Interview
Prep · Outreach Sequences · Company Intel
**Insights** — Action Board · 90-Day Playbook · Stats · Settings

Plus three detail screens: Job Detail (8 tabs), Company Detail, Interview Detail.

Keyboard: `⌘K` quick switcher · `⌘⇧P` command palette · `⌘N` new job · `⌘Z` undo.

---

## Product decisions

The interesting part of this project is not the feature list — it is what the app
refuses to do. Each decision below cost something, and the cost was accepted on
purpose.

**1. The app never writes a resume claim for you.**
`Tailor to JD` ranks and selects from bullets you wrote; it does not generate new
ones. Generating them would demo better and would be the obvious AI feature. It
is rejected because a bullet you cannot defend in an interview is worse than a
gap in your resume — the failure lands 3 weeks later, in a room, with no undo.

**2. Local-first, with no sync.**
Job-search data contains salary expectations, rejections, and immigration status.
Handing that to a third-party SaaS is a real cost that no feature repays. The
price of this choice is honest: no cross-device sync, and clearing the browser
loses everything. Mitigation is manual export, not a promise of durability.

**3. A reachable link is never described as an open role.**
Live Openings badges say `URL answered 200` and name the check date, not "hiring
now". Boards keep filled postings live for weeks. The stronger claim would drive
more clicks and would be false a meaningful share of the time.

**4. Unknown is a first-class state.**
Built In returns 429 to automated checks. Those rows are labelled
`Host blocked the check — unknown, not dead`, not silently dropped and not
silently promoted. The dataset lint (`verify-openings.mjs`) enforces that
`verify` can only be `reachable` or `blocked`.

**5. Every mined row cites its source file.**
Any card can be traced back to the report it was lifted from and re-read. Data
you cannot audit is data you will eventually stop trusting.

**6. The salary parser returns nothing rather than a guess.**
A wrong salary silently poisons the Stats median, and a poisoned median changes
which offers look acceptable. Ambiguity resolves to empty.

**7. The pipeline shows what happened, not what looks good.**
49 of 51 seeded roles sit in Wishlist because they were never submitted. A
tracker that flatters you is a tracker you will use to lie to yourself.

**8. The follow-up engine refuses to claim health it cannot establish.**
Cadence needs a last-touched date. When a record has none (a common result of
importing a backup), the engine returns `stale — no usable date, check manually`
instead of defaulting to healthy. The bug this replaced was silent: undefined
dates produced `NaN`, every comparison returned false, and those applications
were never flagged again. The worst failure mode of a tracker is not crashing —
it is quietly not tracking.

**9. Published numbers are tags, never claims.**
Template reply rates come from vendor blog posts (Hunter.io, Salesforce). They
are rendered as source-tagged metadata, never as "this template gets X%".

**10. Offers rank by cash, not by cash plus stated equity.**
A private company's self-reported equity valuation is marketing. Letting it
decide which offer looks best hands that decision to the counterparty.

**11. Tests assert behaviour, not screen size.**
jsdom cannot evaluate media queries, so `verify-mobile.cjs` asserts the two
things that actually break: the drawer's open/close contract, and the presence
of the specific CSS rules the layout depends on. It does not pretend to prove
the app "looks right at 375px" — that check is a human with a phone.

---

## Verifying a build

`./run.sh test` runs everything: `tsc --noEmit`, a production build, unit tests,
and every suite below. All exit non-zero on failure, so a broken view, a bad
export, or a dirty dataset cannot pass silently.

```bash
node verify.mjs                # main suite: 203 assertions across every view
node verify-render.cjs         # walks all 17 nav views, asserts zero JS errors
node verify-interact.cjs       # opens modals, submits forms, reads localStorage back
node verify-data.cjs           # per-view row counts; fails on an empty collection
node verify-dashboard.cjs      # dashboard panels, quick-add, task toggle
node verify-actions.cjs        # Action Board + inspects the real CSV blob
node verify-offers.mjs         # offer maths, ranking rule, interview calendar
node verify-sequences.mjs      # outreach drafts and filters
node verify-interview-prep.cjs # question bank, STAR stories, round outcomes
node verify-batch2.cjs         # employer-specific question bank + provenance
node verify-templates.mjs      # 60 templates: merge fields, brace balance, tags
node verify-backup.cjs         # export/import round trip; rejects foreign JSON
node verify-research-import.cjs # 1.3k-role research import with a review step
node verify-followups.cjs      # cadence engine unit tests on aged fixtures
node verify-openings.mjs       # dataset lint: URLs, duplicates, prose titles
node verify-mobile.cjs         # drawer contract + responsive CSS contract
```

Two of these exist because of bugs that render tests could not see:

- `verify-followups.cjs` bundles `src/lib` with esbuild and tests pure functions
  against deliberately aged fixtures. The follow-up panel is legitimately empty
  on fresh data, so a UI test cannot distinguish a working engine from a dead one.
- `verify-openings.mjs` reads the dataset as text. Prose lifted into a title cell
  and a markdown backtick glued to a URL both render perfectly — they are only
  visible as a violated data contract.

### Refreshing the mined openings

```bash
npm run clean:openings      # drop prose rows, repair URLs, de-duplicate
npm run recheck:openings    # re-run the HTTP link check, rewrite the check date
```

`verify-openings.mjs` fails once the link check is more than 90 days old, so the
date on the badge cannot quietly become a lie.

---

## Known limitations

- No browser extension, so postings are added by paste or by import — not by
  one click from a job board.
- No cross-device sync (decision 2).
- Mined titles are as good as the source tables; the lint removes prose rows,
  but a badly formatted table can still produce an awkward title.
- Interview Prep provenance is graded, not uniform: some questions are traceable
  to a named source, others are marked type-level and unverified.

---

## Stack

React 18 · TypeScript · Zustand (`persist`, schema version 9 with migrations) ·
Vite 5 · date-fns. 16 entity models in `src/types.ts`. No UI framework — the
design system is hand-written in `src/styles.css` with light and dark themes and
a small-screen breakpoint at 820px.
