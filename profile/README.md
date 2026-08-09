# Job Profile

This folder stores the local candidate profile used by the WhatsApp job search workflow.

The profile is intentionally split into two files: one for candidate facts and filtering rules, and one for application email writing preferences. This keeps job matching honest and keeps email style editable without changing the candidate data.

## Files

| Path | Purpose |
| --- | --- |
| `job-profile.md` | Source of truth for target roles, seniority, skills, preferences, constraints, and rejection rules. |
| `email-body-rules.md` | Source of truth for application email language, tone, structure, greeting, closing, and wording preferences. |
| `documents/` | Optional source material for `/setup` only. Filtering and email sending do not read this folder. |

## How This Folder Is Used

```text
profile/documents/ or pasted context
  -> /setup
  -> profile/job-profile.md
  -> profile/email-body-rules.md

output/jobs-email.json
  -> /filter-whatsapp-jobs reads profile/job-profile.md
  -> output/filtered-jobs.json

output/filtered-jobs.json
  -> /send-job-emails reads profile/job-profile.md + profile/email-body-rules.md
  -> email MCP sends messages
```

## Setup Flow

Run this from your agent CLI at the repository root:

```text
/setup
```

`/setup` can build or refresh the profile from three kinds of input:

- Files placed under `profile/documents/`, such as CVs, resumes, LinkedIn exports, and notes.
- Professional context pasted directly into the conversation.
- An interview-style onboarding flow when you do not have prepared documents.

You can also refresh a specific section when supported by the setup command:

```text
/setup --section roles
/setup --section email-body
```

Review both generated files before relying on the workflow. The filter and email steps are only as good as the local profile data they read.

## Editing Rules

Keep candidate facts in `job-profile.md`:

- Name and contact details used for applications.
- Professional summary.
- Target roles and accepted seniority levels.
- Technologies, tools, domains, and experience.
- Work mode, location, timezone, language, contract, and salary preferences.
- Hard rejection rules and deal-breakers.
- Attachment paths for CVs, portfolios, or other application files.

Keep email-writing preferences in `email-body-rules.md`:

- Email tone and formality.
- Greeting and closing preferences.
- Body structure.
- Signature style.
- Attachment wording.
- Phrases to use or avoid.
- Language-specific preferences.

Do not put new candidate claims only in `email-body-rules.md`. If the email sender needs a fact about you, it should also exist in `job-profile.md`.

## Priority Rules

- Filtering reads `profile/job-profile.md` only.
- Email sending reads `profile/job-profile.md` for candidate facts.
- Email sending reads `profile/email-body-rules.md` for tone, structure, and wording.
- Files under `profile/documents/` are source material for `/setup`, not live filtering input.
- Explicit reject rules in `job-profile.md` always win.
- Weak or ambiguous job matches should be excluded instead of guessed into the shortlist.
- The filter step must create jobs with `send: false`; only successful email sends can change a job to `send: true`.

## Resetting

Use `/reset` when you want to start over:

```text
/reset profile
/reset documents
/reset all
```

Reset is destructive and requires typing exactly `RESET` before anything is changed.

## Placeholder Guide

If a profile file still contains placeholders, replace them before filtering jobs.

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

## Privacy

Profile files can contain personal information, job preferences, salary constraints, email signatures, and local attachment paths. Treat them as private working files unless you intentionally sanitize them for sharing.

Files under `profile/documents/` often contain CVs, resumes, PDFs, LinkedIn exports, and other personal materials. It is fine to version them in your own private fork or private repository if that is useful to your workflow. We recommend avoiding public repositories for personal materials unless they have been intentionally sanitized.
