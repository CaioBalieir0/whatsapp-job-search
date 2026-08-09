---
name: setup-job-profile
description: Use when the user runs /setup, asks to generate profile/job-profile.md, imports CV/resume data, updates job profile sections, or configures job filtering preferences for this WhatsApp job search project.
---

# Setup Job Profile

## Overview

Run onboarding for this WhatsApp job search workspace. Collect the user's professional information and generate or refresh `profile/job-profile.md` so `/filter-whatsapp-jobs` can evaluate jobs from `output/jobs-email.json`. Also generate or refresh `profile/email-body-rules.md` so `/send-job-emails` can write email bodies using user-editable language, tone, and structure preferences.

This skill is for profile setup only. Do not filter jobs, do not send emails, do not call the n8n webhook, and do not modify `output/jobs-email.json` or `output/filtered-jobs.json`.

## Core Contract

- Source materials are optional and live under `profile/documents/`.
- `profile/documents/` is free-form; do not require subfolders or a naming convention.
- The user may also paste a CV, resume, notes, LinkedIn text, or professional context directly into the conversation.
- The generated filtering profile is `profile/job-profile.md`.
- The generated email body preferences file is `profile/email-body-rules.md`.
- `/filter-whatsapp-jobs` reads only `profile/job-profile.md`; it must not read `profile/documents/`.
- `/send-job-emails` reads `profile/job-profile.md` for candidate facts and `profile/email-body-rules.md` for email language, tone, and body structure preferences; it must not read `profile/documents/`.
- Before writing `profile/job-profile.md` or `profile/email-body-rules.md`, present the proposed complete file content and wait for explicit confirmation.
- Prefer a clear, specific profile over a broad profile. Weak or ambiguous future matches should be excluded by the filter.

## Step 0: Welcome And Choose Path

If `$ARGUMENTS` contains `--section <name>`, skip the path-selection prompt and go directly to the matching section in Path C for an update-only flow.

Accepted section names:

- `roles`
- `seniority`
- `skills`
- `reject`
- `work`
- `contract`
- `languages`
- `rules`
- `email`
- `email-body`
- `all`

If no `--section` argument is provided, scan `profile/documents/**/*` with Glob before greeting the user.

Then welcome the user with a single message that lists three paths.

If `profile/documents/` has files, lead with Path A:

```markdown
## Welcome To Job Profile Setup

I'll help you build `profile/job-profile.md` for filtering and `profile/email-body-rules.md` for application email writing preferences.

I found files in `profile/documents/`: [list file paths]. Three ways to start:

**Path A: Read my documents folder** (recommended for what you have) - I'll read the files in `profile/documents/`, cross-reference them for consistency, and build your profile from real source materials. Safe to re-run as you add or change documents.

**Path B: Single CV or notes import** - Paste or mention one CV, resume, LinkedIn export, notes file, or professional context here. I'll extract it and ask follow-up questions for what's missing.

**Path C: Interview mode** - I'll walk you through structured questions section by section. Good if you're starting from scratch.

Which would you like?
```

If `profile/documents/` is empty or missing, surface Path A as optional:

```markdown
## Welcome To Job Profile Setup

I'll help you build `profile/job-profile.md` for filtering and `profile/email-body-rules.md` for application email writing preferences.

Three ways to start:

**Path A: Documents folder** - Add a CV, resume, LinkedIn export, notes, or other professional materials directly under `profile/documents/`, then say "go". See `profile/documents/README.md` for guidance.

**Path B: Single CV or notes import** - Paste or mention one CV, resume, LinkedIn export, notes file, or professional context here. I'll extract it and ask follow-up questions for what's missing.

**Path C: Interview mode** - I'll walk you through structured questions section by section. Good if you're starting from scratch.

Which would you like?
```

Wait for the user's choice. If they pick Path A but `profile/documents/` is still empty, tell them they can add any relevant materials directly under `profile/documents/` and stop.

## Path A: Documents Folder

Path A reads free-form source materials in `profile/documents/`, cross-references them for consistency, and converts them into `profile/job-profile.md` and `profile/email-body-rules.md`. It is read-before-write and safe to re-run: do not duplicate content already represented in the profile files.

Follow these steps exactly in order.

### Step A1: Inventory

Use Glob with `profile/documents/**/*` to scan the full tree. Print:

```markdown
## Documents Found

[list readable file paths, or "(empty)"]

I will read these and cross-reference before proposing changes to `profile/job-profile.md` and `profile/email-body-rules.md`.
```

If no files are found, stop and tell the user to add a CV, resume, LinkedIn export, notes, or other professional materials directly under `profile/documents/`. Point at `profile/documents/README.md`.

### Step A2: Read Existing Profile Files

Read `profile/job-profile.md` and `profile/email-body-rules.md` before extracting anything. Keep both in context throughout Path A.

You must know what is already present to avoid duplicates and to preserve explicit current preferences.

### Step A3: Parse Documents

Read every readable file found in Step A1. The folder is free-form; infer document type from filename, extension, headings, and content.

Extract facts and preferences that help build the profile:

- Target roles and adjacent role titles.
- Seniority levels that match the user's background.
- Strong match technologies, domains, responsibilities, industries, and role types.
- Acceptable secondary matches that are compatible only when the main role direction fits.
- Explicit reject rules and deal-breakers.
- Work mode and location preferences.
- Contract, employment, freelance, schedule, or availability preferences.
- Language requirements and accepted job-posting languages.
- Email body language preferences, preferred email language, fallback language behavior, tone, greeting, closing, signature preferences, and attachment wording preferences.
- Decision rules for weak, ambiguous, or borderline jobs.

For CVs and resumes, extract work history, education, skills, tools, domains, seniority signals, leadership signals, and role direction. Do not copy personal contact details into `profile/job-profile.md` unless they affect job filtering.

For LinkedIn exports or profile text, extract headline, about section, role history, skills, certifications, domains, languages, recommendations, and role positioning.

For notes, preferences, and pasted context, treat explicit current preferences as stronger than older resume history.

For past job postings or application notes, infer calibration signals only when they clearly indicate what the user wants more or less of.

After reading, proceed to Step A4 without intermediate output. The user sees the complete picture in Step A6.

### Step A4: Cross-Reference Check

Before mapping anything to `profile/job-profile.md`, check for inconsistencies:

- Role title or seniority mismatches across documents.
- Date or career-stage inconsistencies that affect seniority.
- Technology stack contradictions.
- Location, remote, hybrid, or relocation contradictions.
- Contract preference contradictions.
- Language requirement contradictions.
- A resume history that conflicts with explicit current preferences in notes.

If inconsistencies are found, present them as a numbered list and wait for the user to resolve each one before continuing:

```markdown
## Cross-Reference Issues Found

These need to be resolved before I continue. For each one, tell me which version is correct.

1. **Work mode mismatch**
   Document A suggests: "Remote only"
   Document B suggests: "Hybrid accepted"
   Which should the profile use?

2. ...
```

If no inconsistencies are found, state `No cross-reference issues found.` and continue.

### Step A5: Build Proposed Profile Files

Compare extracted content against the existing `profile/job-profile.md` and `profile/email-body-rules.md`.

Build a complete proposed version of `profile/job-profile.md` using this structure:

```markdown
# Job Profile

Use this file to describe which WhatsApp job postings should be kept in `output/filtered-jobs.json`.

This file is the profile source used by the filtering skill. To generate or refresh it from a CV, LinkedIn export, notes, or an interview flow, run `/setup`.

## Target Roles

- [specific role]

## Seniority

- [specific seniority]

## Strong Matches

- [technology, domain, responsibility, or role signal]

## Acceptable Matches

- [secondary match with condition]

## Reject

- [explicit reject rule]

## Work Preferences

- [remote, hybrid, on-site, location, timezone, travel, or relocation rule]

## Contract Preferences

- [employment, contract, freelance, schedule, availability, or compensation rule]

## Language Requirements

- [language rule]

## Decision Rules

- Keep only jobs that clearly match this profile.
- Exclude jobs when the match is weak or ambiguous.
- Exclude jobs that match any explicit rejection rule.
- The filtered output must always set `send: false` for every kept job.
```

Build a complete proposed version of `profile/email-body-rules.md` using this structure. Keep the file text in English where possible:

````markdown
# Email Body Rules

Use this file to customize how `/send-job-emails` writes job application email bodies.

This file controls language, tone, structure, and wording preferences. Candidate facts such as role targets, experience, signature, and attachment paths should stay in `profile/job-profile.md` unless a section below explicitly asks for writing preferences.

## Language Preferences

- Preferred email language: [English, Portuguese, match job posting language, or another explicit preference].
- If the job posting explicitly requests another language, [follow the user's preference].
- If the job posting is in [language] and does not request [preferred language], [fallback behavior].
- Do not claim language ability unless that fact is present in `profile/job-profile.md`.

## Tone

- [tone preference]

## Default Structure

```text
[preferred greeting]

[application opening]

[brief professional summary based only on profile/job-profile.md]

[job-specific required content, if any]

[preferred closing]

[candidate name]
[custom signature, if available]
```

## Portuguese Fallback Structure

```text
[Portuguese greeting]

[Portuguese application opening]

[resumo profissional breve baseado apenas em profile/job-profile.md]

[conteúdo específico exigido pela vaga, se houver]

[Portuguese closing]

[nome da pessoa]
[assinatura personalizada, se houver]
```

## Job-Specific Instructions

- Always follow explicit instructions from the job text before these defaults.
- If the job specifies exact body text, include it without contradiction.
- If the job asks for salary expectation, availability, location, language level, or another personal fact, use only facts present in `profile/job-profile.md`.
- If a required fact is missing, skip the job instead of inventing an answer.

## Attachment Wording

- Mention an attachment only when an attachment is actually sent.
- [attachment wording preference]

## Avoid

- [wording or behavior to avoid]
````

Do not leave square-bracket placeholders in the proposed final content unless the user has not provided enough information for that section. If filtering or email body preferences are missing, ask focused follow-up questions before proposing the final content.

### Step A6: Present And Confirm Changes

Present the proposed complete file contents before writing anything:

````markdown
## Proposed `profile/job-profile.md`

```markdown
[complete proposed file]
```

## Proposed `profile/email-body-rules.md`

```markdown
[complete proposed file]
```

Apply these profile files? Reply `yes` to write them, or tell me what to change.
````

Wait for the user's response. Apply only after explicit confirmation.

### Step A7: Write Confirmed Profile Files

Write the confirmed content to `profile/job-profile.md` and `profile/email-body-rules.md` using targeted file editing.

After writing, report:

- The files updated: `profile/job-profile.md` and `profile/email-body-rules.md`.
- Which sections changed.
- Any documents that could not be read.
- That filtering will use only `profile/job-profile.md`.
- That email sending will use `profile/job-profile.md` for candidate facts and `profile/email-body-rules.md` for email body preferences.
- Suggested next step: run `/filter-whatsapp-jobs` after `output/jobs-email.json` exists.

## Path B: Single CV Or Notes Import

Use Path B when the user pastes or mentions one CV, resume, LinkedIn export, notes file, or professional context item.

Follow this flow:

1. Read the provided content thoroughly.
2. Extract target roles, seniority, strong matches, acceptable matches, reject rules, work preferences, contract preferences, language requirements, decision rules, and email body preferences.
3. Present a concise summary of what was extracted.
4. Ask follow-up questions for missing filtering-critical information and email body preferences.
5. Build the proposed complete `profile/job-profile.md` and `profile/email-body-rules.md` using the structures from Step A5.
6. Present both proposed file contents and wait for confirmation.
7. Write `profile/job-profile.md` and `profile/email-body-rules.md` only after confirmation.

Minimum follow-up questions when missing:

- Which role titles should be kept?
- Which seniority levels are acceptable?
- Which technologies, domains, or responsibilities are strong matches?
- Which roles, technologies, companies, industries, or conditions should be rejected?
- What remote, hybrid, on-site, location, timezone, or relocation rules matter?
- Which contract types or schedules are acceptable?
- Which job-posting languages are acceptable?
- Which language should application emails prefer, and when should they match the job posting language?
- What tone, greeting, closing, and attachment wording should application emails use?

## Path C: Interview Mode

Walk through each section conversationally. Ask naturally, not as a rigid form. Let the user answer in their own words and structure the data for them.

If `$ARGUMENTS` contains `--section <name>`, ask only about that section and then update only the corresponding section in `profile/job-profile.md` or `profile/email-body-rules.md` after confirmation.

### Section 1: Target Roles

Ask which job titles should be kept. Collect 3 to 8 specific titles when possible.

Also suggest adjacent titles the user may not have considered based on their experience. Ask before including them.

### Section 2: Seniority

Ask which seniority levels are acceptable and which should be rejected.

Capture whether the user accepts individual contributor, specialist, lead, staff, manager, internship, junior, mid-level, senior, or principal roles.

### Section 3: Strong Matches

Ask which skills, technologies, domains, industries, responsibilities, and role characteristics should strongly increase compatibility.

Focus on terms likely to appear in WhatsApp job postings.

### Section 4: Acceptable Matches

Ask which secondary technologies, domains, or role types are acceptable only when the main role direction still fits.

Each acceptable match should include its condition.

### Section 5: Reject Rules

Ask what should disqualify a job even if it contains one matching keyword.

Cover unwanted roles, technologies, seniority levels, industries, work modes, locations, contract types, language requirements, compensation patterns, and support-only roles.

### Section 6: Work Preferences

Ask about remote, hybrid, on-site, locations, timezone, travel, relocation, commute, and geographic constraints.

Make the resulting rules explicit enough for filtering.

### Section 7: Contract Preferences

Ask about full-time employment, contract work, freelance work, part-time work, internships, availability, compensation constraints, and any deal-breakers.

Use global wording. Do not assume country-specific contract types unless the user provides them.

### Section 8: Language Requirements

Ask which job-posting languages are acceptable, required, optional, or disqualifying.

Capture whether the user accepts English, local language postings, bilingual roles, or roles requiring languages they do not speak.

### Section 9: Decision Rules

Ask how strict the filter should be. Default to strict filtering:

- Keep only clear matches.
- Exclude weak or ambiguous matches.
- Exclude any job that hits an explicit reject rule.
- Never set `send: true` during filtering.

### Section 10: Email Body Rules

Ask how `/send-job-emails` should write application email bodies.

Capture:

- Preferred email language.
- Whether to match the job posting language when the job asks for a specific language.
- Fallback behavior for Portuguese postings.
- Tone.
- Greeting.
- Opening paragraph preference.
- Closing.
- Signature preference.
- Attachment wording.
- Wording or claims to avoid.

Keep the generated `profile/email-body-rules.md` text in English where possible, even when it contains Portuguese fallback snippets.

## Step 3: Generate Profile Files

Once data collection is complete, generate the profile files only.

Do not create or modify unrelated files such as CV templates, scraper queries, `.claude` files, or `CLAUDE.md`. This project uses `profile/job-profile.md` for filtering WhatsApp job postings and `profile/email-body-rules.md` for application email body preferences.

The generated `profile/job-profile.md` file must:

- Use Markdown.
- Preserve the section structure from Step A5.
- Use clear user-specific values instead of generic placeholders whenever possible.
- Avoid local or country-specific assumptions unless provided by the user.
- Keep decision rules strict enough to avoid false positives.
- Include `send: false` only as a filtering output rule, not as a profile attribute for jobs.

The generated `profile/email-body-rules.md` file must:

- Use Markdown.
- Keep section headings and explanatory text in English where possible.
- Include explicit language preferences for application emails.
- Include tone, structure, job-specific instruction handling, attachment wording, and avoid rules.
- Avoid candidate factual claims that are not also present in `profile/job-profile.md`.

Before writing, always present both complete proposed files and wait for confirmation.

## Step 4: Confirm And Next Steps

After writing, present a concise summary:

```markdown
## Setup Complete

Generated or updated:

- `profile/job-profile.md` - normalized profile used by `/filter-whatsapp-jobs`
- `profile/email-body-rules.md` - email body preferences used by `/send-job-emails`

Filtering and sending behavior:

- `/filter-whatsapp-jobs` reads only `profile/job-profile.md`
- `/send-job-emails` reads `profile/job-profile.md` for candidate facts and `profile/email-body-rules.md` for email body preferences
- `profile/documents/` is only source material for `/setup`
- Filtered jobs will be written to `output/filtered-jobs.json` with `send: false`

Next steps:

- Run `/search-whatsapp-jobs 24` to collect recent jobs
- Run `/filter-whatsapp-jobs` to filter them against your profile
- Run `/setup --section roles` later to update a specific section
- Run `/setup --section email-body` later to update email writing preferences
```

## Common Mistakes

- Do not write `profile/job-profile.md` or `profile/email-body-rules.md` before the user confirms the proposed content.
- Do not filter jobs or send emails during setup.
- Do not modify `output/jobs-email.json` or `output/filtered-jobs.json`.
- Do not require subfolders inside `profile/documents/`.
- Do not create `.claude` files, CV templates, scraper queries, `/apply`, or `/scrape` assets for this project.
- Do not treat older resume history as stronger than explicit current preferences.
- Do not leave broad placeholder examples when the user has provided specific information.
- Do not make country-specific assumptions about contracts, languages, or location rules.
- Do not duplicate candidate facts in `profile/email-body-rules.md`; keep facts in `profile/job-profile.md`.

## Design Principles

- Three onboarding paths converge on two normalized files: `profile/job-profile.md` and `profile/email-body-rules.md`.
- Path A is read-before-write and safe to re-run as documents change.
- Path B supports one pasted or mentioned source when the user does not want to organize files.
- Path C is conversational and can update one section at a time.
- Documents are source material for setup only; filtering and sending stay deterministic by reading normalized profile files.
- The user does not need to know Markdown; the agent should synthesize answers into the file structure.
- The job profile should optimize for compatible jobs, not for preserving every historical skill from a resume.
- The email body rules should optimize for editable writing preferences, not for duplicating candidate facts from the job profile.
