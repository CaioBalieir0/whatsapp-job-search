# Job Profile

This folder stores the normalized local profile used to filter WhatsApp job postings from `output/jobs-email.json`.

The filtering skill reads only `job-profile.md`. Use `/setup` to generate or refresh that file from documents or from an interview-style onboarding flow.

## Files

| File | Purpose |
| --- | --- |
| `job-profile.md` | Normalized profile with target roles, skills, preferences, and rejection rules. |
| `documents/` | Optional free-form source documents used by `/setup` only. |

## How To Use

1. Run `/setup` to create or refresh `job-profile.md` from your professional information.
2. Optionally add a CV, LinkedIn export, notes, or other materials under `profile/documents/` before running `/setup`.
3. You can also paste your CV, notes, or professional context directly into the `/setup` conversation.
4. Review `job-profile.md` after setup and edit anything that does not reflect your current target search.
5. Ask the agent to filter the jobs after `output/jobs-email.json` has been generated.

Use `/reset profile`, `/reset documents`, or `/reset all` to start fresh. Reset is destructive and requires typing exactly `RESET` before anything is changed.

The filtering skill reads `job-profile.md` and writes compatible jobs to `output/filtered-jobs.json`. Every filtered job starts with `send: false` so sending or applying can be handled later by a separate step.

## Priority Rules

- `job-profile.md` is the only source used during filtering.
- Files under `profile/documents/` are source material for `/setup`, not for filtering.
- If a match is weak or ambiguous, the agent should exclude the job.
- Explicit reject rules in `job-profile.md` always win.

## Privacy

Resume and CV files often contain personal information. By default, this repository ignores files under `profile/documents/` so local personal materials are not accidentally committed. `profile/README.md`, `profile/job-profile.md`, and `profile/documents/README.md` remain versionable.

## Placeholder Guide

| Placeholder | Replace With |
| --- | --- |
| `[Backend Developer]` | Job titles you want. |
| `[Senior]` | Accepted seniority levels. |
| `[TypeScript]` | Technologies and domains that should strongly increase compatibility. |
| `[Python for backend API roles]` | Technologies you can accept but are not your main target. |
| `[Support-only roles]` | Anything that should disqualify a job. |
| `[Remote preferred]` | Remote, hybrid, on-site, location, or timezone preferences. |
| `[Full-time employment]` | Employment, contract, freelance, internship, or schedule constraints. |
| `[English accepted]` | Languages you accept or reject. |
| `[Exclude weak or ambiguous matches]` | Any personal rule that should affect filtering. |

Keep the profile honest and specific. Vague or outdated context creates vague filtering.
