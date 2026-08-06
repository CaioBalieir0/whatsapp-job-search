---
name: filter-whatsapp-jobs
description: Use when the user asks to filter WhatsApp job postings, match output/jobs-email.json against profile/job-profile.md, or create output/filtered-jobs.json in this n8n project.
---

# Filter WhatsApp Jobs

## Overview

Filter the raw WhatsApp job postings using the user's local job profile. Keep only jobs that match the profile, and always write `send: false` on every kept job.

## Required Workflow

1. Read `profile/job-profile.md`.
2. Read and validate `output/jobs-email.json`.
3. Compare each item in `jobs` against the profile.
4. Keep only jobs that clearly match the profile.
5. Write `output/filtered-jobs.json` with the required schema.
6. Report `sourceTotal`, `total`, and the output path.

Do not call WhatsApp, Evolution API, n8n execution history, databases, or Docker volumes. This skill only filters the local JSON file already produced by the search workflow.

## Inputs

Profile file:

```text
profile/job-profile.md
```

Source file:

```text
output/jobs-email.json
```

The source file must contain:

- `lastRun` as a string.
- `hoursConsulted` as a number.
- `total` as a number.
- `jobs` as an array.
- Every item in `jobs` must contain `sender` as a string.
- Every item in `jobs` must contain `text` as a string.
- Every item in `jobs` must contain `timestamp` as a number.

Each kept job must preserve its original fields, including `sender`, `text`, and `timestamp`.

## Matching Rules

- Use `profile/job-profile.md` as the source of truth.
- Prefer false negatives over false positives when the match is weak.
- Keep a job only when the role, seniority, stack, work mode, language, and reject rules are compatible with the profile.
- Reject jobs that hit the profile's explicit rejection rules, even if one keyword looks relevant.
- If the profile still contains placeholders, use the filled sections and treat empty placeholder sections as unknown, not as matching criteria.

## Output File

Write the filtered result to:

```text
output/filtered-jobs.json
```

Required schema:

```json
{
  "lastRun": "2026-08-06T04:55:58.533Z",
  "hoursConsulted": 24,
  "sourceTotal": 2,
  "total": 1,
  "jobs": [
    {
      "sender": "Job Channel",
      "text": "Job text that matches the profile...",
      "timestamp": 1785939280,
      "send": false
    }
  ]
}
```

Field rules:

- `lastRun` comes from `output/jobs-email.json`.
- `hoursConsulted` comes from `output/jobs-email.json`.
- `sourceTotal` is the original number of source jobs.
- `total` is the number of kept jobs.
- `jobs` contains only compatible jobs.
- `send` must be added to every kept job.
- `send` must always be `false`; never set it to `true`.
- Do not add a `reason` field.

If no jobs match, write a valid empty result:

```json
{
  "lastRun": "2026-08-06T04:55:58.533Z",
  "hoursConsulted": 24,
  "sourceTotal": 2,
  "total": 0,
  "jobs": []
}
```

## Validation

After writing the file, validate it:

```bash
node -e 'const fs=require("fs"); const p="output/filtered-jobs.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); if (typeof j.lastRun !== "string" || typeof j.hoursConsulted !== "number" || typeof j.sourceTotal !== "number" || typeof j.total !== "number" || !Array.isArray(j.jobs)) process.exit(1); if (j.total !== j.jobs.length) process.exit(1); if (j.jobs.some((job)=>typeof job.sender !== "string" || typeof job.text !== "string" || typeof job.timestamp !== "number" || job.send !== false || Object.prototype.hasOwnProperty.call(job,"reason"))) process.exit(1); console.log(JSON.stringify({ sourceTotal: j.sourceTotal, total: j.total }, null, 2));'
```

## Quick Reference

| Situation | Action |
| --- | --- |
| Profile file is missing | Ask the user to run `/setup` or fill `profile/job-profile.md` before filtering |
| Source file is missing or invalid | Ask the user to run the WhatsApp job search first |
| Job clearly matches the profile | Keep it and set `send: false` |
| Job weakly or ambiguously matches | Exclude it |
| Job hits a reject rule | Exclude it |
| No jobs match | Write `total: 0` and `jobs: []` |

## Common Mistakes

- Do not output a bare array; always write the top-level object schema.
- Do not invent profile paths; use `profile/job-profile.md`.
- Do not read resumes, CVs, LinkedIn exports, or other files while filtering. Those materials are only for `/setup`.
- Do not invent output paths; use `output/filtered-jobs.json`.
- Do not keep incompatible jobs for auditing; the output contains only compatible jobs.
- Do not set `send: true` for any reason.
- Do not add `reason`, score, or explanation fields to jobs.
- Do not modify `output/jobs-email.json`.
