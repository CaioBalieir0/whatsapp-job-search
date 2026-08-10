---
name: reset-job-profile
description: Use when the user runs /reset, asks to reset candidate profile data, clear profile/job-profile.md, clear profile/email-body-rules.md, delete profile/documents materials, or start fresh before /setup in this WhatsApp job search project.
---

# Reset Job Profile

## Overview

Reset local job search profile data so the user can start fresh with `/setup`.

This skill is destructive. Do not write, delete, or modify anything until the user explicitly confirms by typing exactly `RESET`.

## Scope

Supported reset scopes:

| Scope | Effect |
| --- | --- |
| `profile` | Replace `profile/job-profile.md` and `profile/email-body-rules.md` with blank templates. |
| `documents` | Delete user-provided files and folders under `profile/documents/`, preserving `profile/documents/README.md` and the `profile/documents/` folder. |
| `all` | Reset both profile and documents. |

This project does not use legacy `job-application-assistant` profile files or structured `documents/cv/`, `documents/linkedin/`, `documents/diplomas/`, `documents/references/`, or `documents/applications/` folders. Do not create, inspect, or reset those paths.

## Step 0: Parse Scope From Arguments

Check `$ARGUMENTS` for one recognized scope keyword:

- `profile`
- `documents`
- `all`

If `$ARGUMENTS` is empty or does not contain a recognized scope keyword, ask:

```markdown
## What would you like to reset?

- `profile` - Clears `profile/job-profile.md` and `profile/email-body-rules.md` back to blank templates. Use this to re-run `/setup` from scratch while keeping files in `profile/documents/`.
- `documents` - Deletes user-provided files from `profile/documents/` only. The folder and `profile/documents/README.md` are preserved.
- `all` - Both of the above.

Reply with `profile`, `documents`, or `all`.
```

Wait for the user's response before continuing.

## Step 1: Show Exactly What Will Be Cleared

Before doing anything destructive, show the user precisely what will be wiped.

### If Scope Includes `profile`

Read `profile/job-profile.md` and `profile/email-body-rules.md` and report whether each file has candidate data or is already blank.

Treat the file as already blank if it contains only the standard blank template shown in Step 3. Treat it as having candidate data if it differs from that template or contains non-placeholder personal preferences.

Present:

```markdown
## Profile reset will clear:

- profile/job-profile.md - [has content / already blank / missing]
  Full file will be replaced with the blank job profile template.
- profile/email-body-rules.md - [has content / already blank / missing]
  Full file will be replaced with the blank email body rules template.
```

### If Scope Includes `documents`

Use Glob with `profile/documents/**/*` to list all files and folders under `profile/documents/`.

Exclude `profile/documents/README.md` from deletion. If the only entry is `profile/documents/README.md`, the documents scope has nothing to delete.

Present:

```markdown
## Documents reset will delete:

profile/documents/
  - [relative path]
  - [relative nested/path]
  - or "(empty)"

profile/documents/README.md - NOT deleted
```

If documents are already empty and the scope is only `documents`, state "All document files are already empty - nothing to delete." and stop without asking for confirmation.

If documents are already empty but the scope also includes `profile`, continue because the profile reset may still need confirmation.

## Step 2: Require Explicit Confirmation

If there is anything to modify or delete, present:

```markdown
## This cannot be undone.

Type `RESET` (all caps) to confirm, or anything else to cancel.
```

Wait for the user's response.

- If the user types exactly `RESET`, proceed to Step 3.
- If the user types anything else, abort and tell them: `Reset cancelled. Nothing was changed.`

Do not accept `reset`, `Reset`, `RESET profile`, or any other variation.

## Step 3: Execute The Reset

### Profile Reset

Replace `profile/job-profile.md` with exactly:

```markdown
# Job Profile

Use this file to describe which WhatsApp job postings should be kept in `output/filtered-jobs.json`.

Replace the bracketed placeholders with your real preferences. Remove lines that do not apply.

This file is the profile source used by the filtering skill. To generate or refresh it from a CV, LinkedIn export, notes, or an interview flow, run `/setup`.

## Target Roles

- [Backend Developer]
- [Full Stack Developer]
- [Technical Lead]

## Seniority

- [Senior]
- [Specialist]
- [Lead]

## Strong Matches

- [Node.js]
- [TypeScript]
- [APIs]
- [Relational databases]
- [Containers]

## Acceptable Matches

- [A secondary technology, only when the role still matches the target direction]
- [A secondary domain, only when the role is aligned with the target responsibilities]

## Reject

- [Roles outside the target career path]
- [Technologies you do not want to work with]
- [Support-only roles]
- [Entry-level roles, if not applicable]
- [On-site only roles, if not applicable]

## Work Preferences

- [Remote preferred]
- [Hybrid accepted only in selected locations]
- [On-site accepted only in selected locations]

## Contract Preferences

- [Full-time employment accepted]
- [Contract work accepted]
- [Freelance accepted only for selected projects]
- [Part-time accepted only if applicable]

## Language Requirements

- [English accepted]
- [Local language accepted]
- [Additional languages accepted only if optional]

## Attachments

- [CV or resume path, for example `profile/documents/cv.pdf` or `/absolute/path/to/cv.pdf`]
- [Portfolio or other attachment path, if applicable]
- [When to attach each file, if multiple attachments are configured]
- Do not attach files unless the job asks for a CV/resume attachment or I explicitly request attachments.

## Decision Rules

- [Exclude weak or ambiguous matches]
- Keep only jobs that clearly match this profile.
- Exclude jobs when the match is weak or ambiguous.
- Exclude jobs that match any explicit rejection rule.
- The filtered output must always set `send: false` for every kept job.
```

Replace `profile/email-body-rules.md` with exactly:

````markdown
# Email Body Rules

Use this file to customize how `/send-job-emails` writes job application email bodies.

Replace the bracketed placeholders with your real preferences. Remove lines that do not apply.

This file controls language, tone, structure, and wording preferences. Candidate facts such as role targets, experience, signature, and attachment paths should stay in `profile/job-profile.md` unless a section below explicitly asks for writing preferences.

## Language Preferences

- Preferred email language: [English]
- If the job posting explicitly requests another language, [match the requested language]
- If the job posting is in Portuguese and does not request English, [Portuguese is acceptable]
- Do not claim language ability unless that fact is present in `profile/job-profile.md`.

## Tone

- [Professional]
- [Direct]
- [Polite]

## Default Structure

```text
[Preferred greeting]

[Application opening]

[Brief professional summary based only on profile/job-profile.md]

[Job-specific required content, if any]

[Preferred closing]

[Candidate name]
[Custom signature, if available]
```

## Portuguese Fallback Structure

```text
[Portuguese greeting]

[Portuguese application opening]

[Resumo profissional breve baseado apenas em profile/job-profile.md]

[Conteúdo específico exigido pela vaga, se houver]

[Portuguese closing]

[Nome da pessoa]
[Assinatura personalizada, se houver]
```

## Job-Specific Instructions

- Always follow explicit instructions from the job text before these defaults.
- If the job specifies exact body text, include it without contradiction.
- If the job asks for salary expectation, availability, location, language level, or another personal fact, use only facts present in `profile/job-profile.md`.
- If a required fact is missing, skip the job instead of inventing an answer.

## Attachment Wording

- Mention an attachment only when an attachment is actually sent.
- [Attachment wording preference]

## Avoid

- [Personal details not present in profile/job-profile.md]
- [Overstated experience]
- [Salary expectation unless explicitly present in profile/job-profile.md]
````

### Documents Reset

Delete every Glob-listed entry under `profile/documents/` except `profile/documents/README.md`.

Use Bash `rm -rf` only with exact quoted paths that were shown to the user in Step 1. Do not delete `profile/documents/` itself. Do not delete `profile/documents/README.md`.

Example shape for exact paths:

```bash
rm -rf "profile/documents/resume.pdf" "profile/documents/old-notes" "profile/documents/nested/file.txt"
```

Never run a broad command such as `rm -rf profile/documents/*`, because it could delete files that were not listed or reviewed with the user.

## Step 4: Confirm What Was Done And Next Steps

After the reset is complete, report:

```markdown
## Reset Complete

### Cleared

[List each file or folder actually modified or cleared]

### Unchanged

[List anything that was already blank/empty or intentionally preserved]
```

Then include next steps based on scope:

If profile was reset:

```markdown
Your job profile is now blank. Run `/setup` to repopulate it. The command can read files in `profile/documents/`, accept pasted CV or notes, or walk you through an interview flow.
```

If documents were reset:

```markdown
The `profile/documents/` folder has been cleared. Add career documents there and run `/setup` to populate your profile. See `profile/documents/README.md` for guidance.
```

If both were reset:

```markdown
Both your job profile and documents folder are now blank. Add documents to `profile/documents/` if you want, or skip documents and use the CV import or interview path, then run `/setup`.
```

## Safety Rules

- Never modify anything before exact `RESET` confirmation.
- Never delete `profile/documents/README.md`.
- Never delete the `profile/documents/` folder itself.
- Never modify `output/jobs-email.json` or `output/filtered-jobs.json`.
- Never run the WhatsApp search CLI.
- Never inspect Docker, WhatsApp, Evolution API, or generated search data.
- Never reset legacy `job-application-assistant` files for this project.
