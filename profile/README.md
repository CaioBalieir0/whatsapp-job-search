# Job Profile

This folder stores the normalized local profile used to filter WhatsApp job postings from `output/jobs-email.json` and customize application email bodies.

The filtering skill reads only `job-profile.md`. The email sending skill reads `job-profile.md` for candidate facts and `email-body-rules.md` for language, tone, structure, and wording preferences. Use `/setup` to generate or refresh both files from documents or from an interview-style onboarding flow.

## Files

| File | Purpose |
| --- | --- |
| `job-profile.md` | Normalized profile with target roles, skills, preferences, and rejection rules. |
| `email-body-rules.md` | User-editable application email body language, tone, structure, and wording preferences. |
| `documents/` | Optional free-form source documents used by `/setup` only. |

## How To Use

1. Run `/setup` to create or refresh `job-profile.md` and `email-body-rules.md` from your professional information.
2. Optionally add a CV, LinkedIn export, notes, or other materials under `profile/documents/` before running `/setup`.
3. You can also paste your CV, notes, or professional context directly into the `/setup` conversation.
4. Review `job-profile.md` after setup and edit anything that does not reflect your current target search.
5. Review `email-body-rules.md` after setup and edit language, tone, structure, greeting, closing, attachment wording, or avoid rules.
6. Ask the agent to filter the jobs after `output/jobs-email.json` has been generated.

Use `/reset profile`, `/reset documents`, or `/reset all` to start fresh. Reset is destructive and requires typing exactly `RESET` before anything is changed.

The filtering skill reads `job-profile.md` and writes compatible jobs to `output/filtered-jobs.json`. Every filtered job starts with `send: false` so `/send-job-emails` can later send or skip it. The email sending skill reads `email-body-rules.md` for body preferences and marks successful sends with `send: true`.

## Priority Rules

- `job-profile.md` is the only source used during filtering.
- `email-body-rules.md` is the only source used for email body language, tone, structure, and wording preferences.
- Candidate facts should stay in `job-profile.md`; email writing preferences should stay in `email-body-rules.md`.
- Files under `profile/documents/` are source material for `/setup`, not for filtering.
- If a match is weak or ambiguous, the agent should exclude the job.
- Explicit reject rules in `job-profile.md` always win.

## Privacy

Resume and CV files often contain personal information. By default, this repository ignores files under `profile/documents/` so local personal materials are not accidentally committed. `profile/README.md`, `profile/job-profile.md`, `profile/email-body-rules.md`, and `profile/documents/README.md` remain versionable.

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
