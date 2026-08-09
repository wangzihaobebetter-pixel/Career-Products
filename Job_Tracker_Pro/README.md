# Job Tracker Pro

A local-first job-search workspace. Pipeline tracking, kanban, target-company
research, a resume bullet library, email templates, an interview question bank,
and statistics — all in one single-page app.

**Your data never leaves your machine.** Everything is stored in your browser's
`localStorage` under the key `job-tracker-pro-v2`. There is no server, no
account, and no analytics.

---

## Run it on your own computer

```bash
./run.sh
```

That is the whole thing. It installs dependencies on first run, builds the app,
starts a local server on `http://localhost:4173/`, and opens your browser.
Press `Ctrl+C` in the terminal window to stop it.

If you want to edit the code and see changes live:

```bash
./run.sh dev      # hot-reload dev server on http://localhost:5173/
```

**Requirement:** Node.js (LTS) from <https://nodejs.org>. Nothing else.

---

## What ships with it

Seeded from the 2026-08-09 screening research, so the app is useful on first open:

| | |
|---|---|
| Target companies | 22, ranked and scored out of 50 |
| Roles | 50, with fit scores, salary bands, remote type |
| Resume bullets | 31, tagged by competency |
| Email templates | Cold outreach, referral asks, follow-ups, thank-yous, post-rejection, salary counters, cover letter, networking — with merge fields |
| Interview questions | 42, including company-specific sets for Klaviyo, Glean, Harvey, Cursor, Notion, Datadog, Mercury, Replit and others |
| STAR stories | Scaffolds linked to the questions they answer |
| Contacts | 18 role slots (recruiter / hiring manager / alum) per target company — names are yours to fill in |
| Tasks | 10 concrete next actions with due dates and priorities |
| Goals | 5 (weekly applications, networking, follow-ups; monthly interviews; quarterly offers) |
| Saved searches | 5 stored criteria sets |

Only roles that were actually submitted appear outside Wishlist. The tracker is
not decorated with applications that were never sent.

---

## The 11 views

- **Dashboard** — KPIs, today's tasks, upcoming interviews, pipeline snapshot, top targets, activity log
- **Pipeline** — kanban (drag between stages), list, and table modes; search, stage filter, stuck-only filter
- **Companies** — scored cards by tier, with your research angle per company
- **Contacts** — warmth rating, relationship type, outreach status
- **Interviews** — calendar and list, with scheduling
- **Resume & Bullets** — bullet library with one-click copy, plus resume versions
- **Email Templates** — merge-field templates by category
- **Interview Prep** — question bank with coaching notes and linked STAR stories
- **Action Board** — tasks bucketed by overdue / today / next 7 days, weekly and monthly goals whose progress is computed from real records, saved search criteria, and the activity log
- **Stats** — funnel conversion and response-rate analysis
- **Settings** — theme, profile, JSON backup export/import, pipeline CSV export, reset

Keyboard: `⌘K` quick switcher, `⌘N` new job.

---

## Verifying a build

```bash
npx tsc --noEmit          # type check
npx vite build            # production build
node verify-render.cjs    # walks all 11 views, asserts seeded data renders
node verify-interact.cjs  # opens modals, submits forms, moves stages, checks persistence
node verify-actions.cjs   # Action Board task toggle + CSV export contents
```

These load the built bundle in jsdom and drive the real UI — they open modals,
submit forms, tick task checkboxes, and read back what landed in
`localStorage`. `verify-actions.cjs` intercepts the CSV download and inspects
the actual blob, so a broken export cannot pass. All three exit non-zero on
failure.

---

## Stack

React 18 · TypeScript · Zustand (with `persist`) · Vite 5 · date-fns.
16 entity models in `src/types.ts`. No UI framework — the design system is
hand-written in `src/styles.css` with light and dark themes.
