# WhatsApp Job Search Workspace

This repository is a local automation workspace for finding job postings received through WhatsApp, saving them as structured JSON, and filtering them against a local job profile.

The current setup uses Docker Compose to run n8n and its supporting services. The n8n workflow is expected to expose a webhook named `buscar-vagas`, write raw job results to `output/jobs-email.json`, and let opencode agent commands filter those results into `output/filtered-jobs.json`.

## What It Does

- Runs n8n locally on port `5678`.
- Runs Postgres for n8n persistence.
- Runs Redis and Evolution API for WhatsApp-related integration support.
- Calls the n8n webhook `POST http://localhost:5678/webhook/buscar-vagas` with a configurable `hours` window.
- Stores the raw search result in `output/jobs-email.json`.
- Uses `profile/job-profile.md` as the local source of truth for job preferences.
- Uses `profile/email-body-rules.md` as the local source of truth for application email body language, tone, and structure preferences.
- Filters compatible jobs into `output/filtered-jobs.json`.
- Marks every filtered job with `send: false` so a later step can decide what to send or apply to.
- Sends professional application emails for filtered jobs through the local email MCP and marks successful sends with `send: true`.

## Data Flow

```text
WhatsApp messages
  -> Evolution API / n8n workflow
  -> buscar-vagas webhook
  -> /data/output/jobs-email.json inside the n8n container
  -> output/jobs-email.json in this repository
  -> profile-based filtering
  -> output/filtered-jobs.json
  -> email application sending through MCP
  -> output/filtered-jobs.json updated with send: true for successful sends
```

## Services

The local stack is defined in `docker-compose.yml`.

| Service | Purpose | Local Port |
| --- | --- | --- |
| `n8n` | Automation workflow runner and webhook host. | `5678` |
| `postgres` | Database used by n8n and Evolution API. | `5433` |
| `redis` | Cache used by Evolution API. | Not exposed |
| `evolution-api` | WhatsApp integration service. | `8080` |

The n8n container mounts `./output` to `/data/output`, so files written by n8n under `/data/output` appear in the repository under `output/`.

## Folder Structure

```text
.
+-- docker-compose.yml
+-- README.md
+-- .opencode/
|   +-- opencode.json
|   +-- skills/
|       +-- setup-job-profile/
|       |   +-- SKILL.md
|       +-- reset-job-profile/
|       |   +-- SKILL.md
|       +-- search-whatsapp-jobs/
|       |   +-- SKILL.md
|       +-- filter-whatsapp-jobs/
|       |   +-- SKILL.md
|       +-- send-job-emails/
|           +-- SKILL.md
+-- output/
|   +-- jobs-email.json
|   +-- filtered-jobs.json
+-- profile/
    +-- README.md
    +-- job-profile.md
    +-- email-body-rules.md
    +-- documents/
        +-- README.md
```

| Path | Purpose |
| --- | --- |
| `docker-compose.yml` | Defines the local n8n, Postgres, Redis, and Evolution API stack. |
| `.opencode/opencode.json` | Registers project commands for opencode. |
| `.opencode/skills/setup-job-profile/SKILL.md` | Agent workflow for generating or refreshing the local profile. |
| `.opencode/skills/reset-job-profile/SKILL.md` | Agent workflow for resetting local profile data before running setup again. |
| `.opencode/skills/search-whatsapp-jobs/SKILL.md` | Agent workflow for running the n8n job-search webhook and validating raw output. |
| `.opencode/skills/filter-whatsapp-jobs/SKILL.md` | Agent workflow for filtering raw jobs against the local profile. |
| `.opencode/skills/send-job-emails/SKILL.md` | Agent workflow for sending professional application emails for filtered jobs through the email MCP. |
| `output/jobs-email.json` | Raw job-search result written by the n8n workflow. |
| `output/filtered-jobs.json` | Filtered job list generated from the local profile. Tracks `send: false` for pending jobs and `send: true` after successful email sends. |
| `profile/job-profile.md` | Normalized profile with target roles, skills, preferences, and rejection rules. |
| `profile/email-body-rules.md` | User-editable rules for application email body language, tone, structure, and wording preferences. |
| `profile/README.md` | Instructions for generating and editing the job profile. |
| `profile/documents/` | Optional free-form source materials for `/setup`; not used by filtering. |

## Raw Output Schema

`output/jobs-email.json` is expected to use this top-level schema:

```json
{
  "lastRun": "2026-08-06T04:55:58.533Z",
  "hoursConsulted": 24,
  "total": 1,
  "jobs": [
    {
      "sender": "Job Channel",
      "text": "Job posting text...",
      "timestamp": 1785939280
    }
  ]
}
```

Required fields:

- `lastRun`: ISO timestamp for the search run.
- `hoursConsulted`: number of hours used by the webhook query.
- `total`: number of raw jobs found.
- `jobs`: array of job objects.
- `jobs[].sender`: source sender or channel name.
- `jobs[].text`: original job message text.
- `jobs[].timestamp`: message timestamp.

## Filtered Output Schema

`output/filtered-jobs.json` is expected to use this schema:

```json
{
  "lastRun": "2026-08-06T04:55:58.533Z",
  "hoursConsulted": 24,
  "sourceTotal": 2,
  "total": 1,
  "jobs": [
    {
      "sender": "Job Channel",
      "text": "Compatible job posting text...",
      "timestamp": 1785939280,
      "send": false
    }
  ]
}
```

Filtering rules:

- Only compatible jobs are kept.
- Every kept job preserves `sender`, `text`, and `timestamp`.
- Every kept job gets `send: false`.
- `send` must never be set to `true` by the filter step.
- `/send-job-emails` may later update successfully sent jobs to `send: true`.
- Jobs must not include a `reason` field.
- `output/jobs-email.json` must not be modified by the filter step.

## Job Profile

The filter profile lives at:

```text
profile/job-profile.md
```

Edit this file to describe the roles, seniority levels, technologies, work modes, languages, and rejection rules that should guide filtering.

Placeholders use square brackets, for example `[Backend Developer]`. Replace them with your real preferences before relying on filtering results.

You can generate or refresh this file with `/setup`. If you have source materials, place them under `profile/documents/` before running setup, or paste your CV, notes, and professional context directly into the setup conversation. Filtering reads only `profile/job-profile.md`, not the documents folder.

For `/send-job-emails`, include explicit candidate facts in `profile/job-profile.md`, such as candidate name, professional summary, signature, and attachment paths. Customize email body language, tone, structure, and wording in `profile/email-body-rules.md`. The email-sending skill reads these two profile files; it does not read `profile/documents/`.

See `profile/README.md` for profile editing guidance.

## Local Usage

Start the local stack:

```bash
docker compose up -d
```

Check containers:

```bash
docker compose ps
```

Call the n8n webhook manually:

```bash
curl -X POST http://localhost:5678/webhook/buscar-vagas \
  -H "Content-Type: application/json" \
  -d '{"hours": 24}'
```

Validate the raw output:

```bash
node -e 'const fs=require("fs"); const p="output/jobs-email.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); if (typeof j.lastRun !== "string" || typeof j.hoursConsulted !== "number" || typeof j.total !== "number" || !Array.isArray(j.jobs)) process.exit(1); if (j.jobs.some((job)=>typeof job.sender !== "string" || typeof job.text !== "string" || typeof job.timestamp !== "number")) process.exit(1); console.log(JSON.stringify({ lastRun: j.lastRun, hoursConsulted: j.hoursConsulted, total: j.total }, null, 2));'
```

## Email MCP

This repository includes a local OpenCode MCP server under `mcp/` with one tool, `send_email`. It sends plain text email through SMTP and is configured for Gmail SMTP by environment variables.

Required environment variables:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER`: Gmail account address
- `SMTP_PASS`: Google app password, not the normal Google password
- `SMTP_FROM`: sender address, normally the same as `SMTP_USER`

Install MCP dependencies:

```bash
npm install --prefix mcp
```

Use `/send-job-emails confirm` to preview generated application emails before sending. Use `/send-job-emails auto` to send eligible filtered jobs automatically after validation. Both modes use `profile/job-profile.md` for candidate facts, `profile/email-body-rules.md` for email body preferences, the email MCP for sending, and update `output/filtered-jobs.json` to `send: true` only after successful sends.

After changing `.opencode/opencode.json` or SMTP environment variables, quit and restart OpenCode so the MCP config is loaded.

## Agent Skills

The repository includes project-level opencode skills under `.opencode/skills/`.

| Skill | Purpose |
| --- | --- |
| `setup-job-profile` | Runs `/setup` onboarding and generates or refreshes `profile/job-profile.md` and `profile/email-body-rules.md` from documents, pasted context, or interview mode. |
| `reset-job-profile` | Runs `/reset` and clears `profile/job-profile.md`, `profile/documents/`, or both after explicit confirmation. |
| `search-whatsapp-jobs` | Runs the n8n webhook, validates `output/jobs-email.json`, and reports the search result summary. |
| `filter-whatsapp-jobs` | Reads `profile/job-profile.md` and `output/jobs-email.json`, keeps compatible jobs, and writes `output/filtered-jobs.json`. |
| `send-job-emails` | Reads `profile/job-profile.md`, `profile/email-body-rules.md`, and `output/filtered-jobs.json`, sends professional application emails through the email MCP, and marks successful sends with `send: true`. |

These skills define the expected agent behavior and guardrails. They prevent the agent from bypassing the webhook flow, querying internal databases directly, calling WhatsApp directly, inventing output schemas, reading profile documents during filtering or sending, or marking failed sends as sent.

## Agent Commands

The repository registers opencode commands in `.opencode/opencode.json`.

| Command | Usage | Purpose |
| --- | --- | --- |
| `/setup` | `/setup`, `/setup --section roles`, or `/setup --section email-body` | Generates or refreshes `profile/job-profile.md` and `profile/email-body-rules.md` from `profile/documents/`, a pasted CV, or interview mode. |
| `/reset` | `/reset profile`, `/reset documents`, or `/reset all` | Resets local profile data after exact `RESET` confirmation. |
| `/search-whatsapp-jobs` | `/search-whatsapp-jobs 24` | Searches WhatsApp jobs through the n8n webhook for the provided number of hours. If no hours are provided, the agent asks which time window to use. |
| `/filter-whatsapp-jobs` | `/filter-whatsapp-jobs` | Filters `output/jobs-email.json` against `profile/job-profile.md` and writes `output/filtered-jobs.json`. |
| `/job-search-pipeline` | `/job-search-pipeline 24` | Runs the full flow: search through the webhook, validate raw output, filter against the profile, and validate filtered output. |
| `/send-job-emails` | `/send-job-emails confirm` or `/send-job-emails auto` | Sends professional application emails for filtered jobs through the email MCP. `confirm` previews the batch first; `auto` sends after validation. |

After changing `.opencode/opencode.json` or any skill file, quit and restart opencode. Configuration and skills are loaded at startup and are not hot-reloaded in the current session.

## Current Limitations

- The n8n workflow itself is expected to exist in the local n8n instance; this repository currently documents and supports the workflow contract rather than exporting the full workflow definition.
- `output/filtered-jobs.json` is generated by the agent filtering step, not directly by the n8n webhook.
- Email sending depends on the local email MCP being configured with valid SMTP environment variables and OpenCode being restarted after configuration changes.
