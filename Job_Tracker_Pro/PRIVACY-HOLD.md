# Privacy hold — Outreach Sequences module

**Status: local-only. Not committed, not deployed to GitHub Pages.**

## What is being held back

Three files, all listed in the repo `.gitignore`:

- `src/seed6.ts` — 11 outreach targets × 3 email drafts
- `src/views/Sequences.tsx` — the view that renders them
- `verify-sequences.mjs` — its test

They run fine locally. Everything in this document is about publishing them, not
about using them.

## Why they are held

This repository is **public**, and it currently contains no third-party email
addresses at all (verified with `git grep` over `HEAD`). `seed6.ts` would add:

- **11 named real people** — founders, a CTO, a recruiter, an NEU alum
- **6 email addresses**, of which:
  - 2 are company-wide inboxes (`hello@mindgard.ai`, `hello@nametag.com`) — these
    are published by the companies themselves and are not sensitive
  - **4 are guesses** at a personal address from a common `first@company.com`
    pattern: `alex@cephalable.com`, `madison@indico-data.com`,
    `peter@codemetal.com`, `shimon@tomorrow.io`

The four guesses are the problem. Nobody published them. Pushing them to a public
repo would put speculative personal contact details for identifiable people onto
the open internet under Zihao's name, permanently and searchably — GitHub is
mirrored and indexed, so a later deletion does not undo it.

One of the four is also visibly wrong: the company is **Cephable**, but the
address reads `cephalable.com`. That is a good illustration of the general point —
these were never checked.

## What this costs

Nothing local. `./run.sh` builds the full app including Outreach Sequences, and
the module's 12 checks pass. The only effect is that the GitHub Pages copy has 15
nav items instead of 16.

## How to publish it later, if that is wanted

Two options, in order of preference:

1. **Verify the addresses first.** Confirm each one on the company site or
   LinkedIn, drop the ones that cannot be confirmed, then remove the `.gitignore`
   entries. Verified-and-published business contacts are ordinary information.
2. **Publish redacted.** Strip the `address` field to `''` and set every
   `addressConfidence` to `'channel_only'` before building for Pages. The drafts,
   the cadence, and the coaching notes are the valuable part; the addresses are
   not what makes this module useful.

Do **not** simply delete the `.gitignore` lines. `dist/` is committed so Pages can
serve the app, which means a rebuilt bundle embeds the addresses too — both the
source and the build output have to be handled.

_Written 2026-08-09._
