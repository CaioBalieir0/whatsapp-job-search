# WhatsApp Job Search

*A local job-search assistant that turns WhatsApp job posts into filtered opportunities and ready-to-send application emails.*

WhatsApp Job Search is a local automation workspace built around [n8n](https://n8n.io/), WhatsApp integration support, agent commands, and a small email MCP server. It searches recent job postings received through WhatsApp, stores them as structured JSON, filters them against your local candidate profile, and helps send professional application emails through SMTP.

The whole workflow runs on your machine. Your profile, raw job messages, filtered results, and email preferences stay in local files.

## What This Is

This project is not a public job board scraper. It is a personal workflow for job opportunities that already arrive in your WhatsApp channels or groups.

The local stack receives and processes WhatsApp-related job messages through n8n, then local agent commands handle the candidate-aware parts:

- Generate or refresh your job-search profile.
- Search recent WhatsApp job posts through the n8n webhook.
- Filter jobs against your target roles, technologies, work mode, seniority, language, and rejection rules.
- Build professional application emails from the filtered jobs.
- Send emails through a local MCP server only after the configured command flow validates them.

```text
WhatsApp job messages
  -> Evolution API / n8n workflow
  -> buscar-vagas webhook
  -> output/jobs-email.json
  -> profile-based filtering
  -> output/filtered-jobs.json
  -> email draft and send through MCP
```

## Prerequisites

- [Docker](https://www.docker.com/) with Docker Compose.
- An agent CLI or MCP-capable coding assistant that can use the included project commands and skills.
- Node.js and npm for the local email MCP server.
- A configured n8n workflow that exposes `POST http://localhost:5678/webhook/buscar-vagas` and writes raw results to `/data/output/jobs-email.json` inside the n8n container.
- Optional email sending: SMTP credentials, for example a Gmail address plus a Google app password.

## Quick Start

### 1. Fork and clone

Create your own fork before adding profile data, documents, or credentials:

```bash
gh repo fork CaioBalieir0/whatsapp-job-search-n8n --clone
cd whatsapp-job-search-n8n
```

If you do not use GitHub CLI, fork the repository on GitHub and clone your fork manually.

Recommended: use a private fork or private repository if you plan to store CVs, resumes, personal notes, generated job data, or application materials in Git.

### 2. Start the local automation stack

```bash
docker compose up -d
```

The stack starts:

| Service | Purpose | Local Port |
| --- | --- | --- |
| `n8n` | Automation workflow runner and webhook host. | `5678` |
| `postgres` | Persistence for n8n and Evolution API. | `5433` |
| `redis` | Cache for Evolution API. | Not exposed |
| `evolution-api` | WhatsApp integration service. | `8080` |

Check the running services with:

```bash
docker compose ps
```

### 3. Create your job profile

Start your agent CLI in this repository and run:

```text
/setup
```

`/setup` creates or refreshes:

- `profile/job-profile.md`: your target roles, skills, preferences, and rejection rules.
- `profile/email-body-rules.md`: your preferred language, tone, structure, and wording for application emails.

You can place CVs, resume PDFs, LinkedIn exports, notes, or other source material in `profile/documents/` before running setup. You can also paste professional context directly into the setup conversation.

See [`profile/README.md`](profile/README.md) and [`profile/documents/README.md`](profile/documents/README.md) for the profile workflow.

### 4. Search recent WhatsApp jobs

Run the search command with a time window in hours:

```text
/search-whatsapp-jobs 24
```

This calls the local n8n webhook and validates `output/jobs-email.json`.

### 5. Filter jobs against your profile

```text
/filter-whatsapp-jobs
```

This reads `profile/job-profile.md`, filters `output/jobs-email.json`, and writes compatible jobs to `output/filtered-jobs.json`. Every kept job starts with `send: false`.

You can run search and filter together with:

```text
/job-search-pipeline 24
```

### 6. Send application emails

Install the MCP dependencies:

```bash
npm install --prefix mcp
```

Set the SMTP environment variables in the shell that starts your agent or MCP client:

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-google-app-password
export SMTP_FROM=your-email@gmail.com
```

Restart your agent or MCP client after changing MCP or SMTP configuration. Then preview emails before sending:

```text
/send-job-emails confirm
```

Or send all eligible filtered jobs automatically after validation:

```text
/send-job-emails auto
```

Successful sends are marked with `send: true` in `output/filtered-jobs.json`. Failed sends must stay pending.

See [`mcp/README.md`](mcp/README.md) for SMTP setup, attachments, scheduled emails, and worker usage.

## Commands

The project includes these local agent commands:

| Command | Example | Purpose |
| --- | --- | --- |
| `/setup` | `/setup` | Generate or refresh `profile/job-profile.md` and `profile/email-body-rules.md`. |
| `/reset` | `/reset profile` | Reset profile files, documents, or both after explicit confirmation. |
| `/search-whatsapp-jobs` | `/search-whatsapp-jobs 24` | Search WhatsApp jobs through the n8n webhook for the provided number of hours. |
| `/filter-whatsapp-jobs` | `/filter-whatsapp-jobs` | Filter raw jobs against the local profile. |
| `/job-search-pipeline` | `/job-search-pipeline 24` | Run search and filtering in one flow. |
| `/send-job-emails` | `/send-job-emails confirm` | Send application emails for filtered jobs through the email MCP. |

## Project Structure

```text
.
|-- docker-compose.yml              # Local n8n, Postgres, Redis, and Evolution API stack
|-- README.md                       # Project overview and quick start
|-- mcp/
|   |-- README.md                   # Local email MCP documentation
|   |-- email-server.mjs            # MCP server exposing send_email
|   |-- email-worker.mjs            # Scheduled email queue worker
|   `-- package.json                # MCP scripts and dependencies
|-- output/
|   |-- jobs-email.json             # Raw job-search output from n8n
|   `-- filtered-jobs.json          # Profile-filtered jobs and send status
`-- profile/
    |-- README.md                   # Profile usage and editing guide
    |-- job-profile.md              # Local source of truth for filtering
    |-- email-body-rules.md         # Local source of truth for email wording
    `-- documents/
        `-- README.md               # Optional setup source-material guide
```

## Technical Docs

- [`profile/README.md`](profile/README.md): how the candidate profile and email body rules work.
- [`profile/documents/README.md`](profile/documents/README.md): how to provide source material for `/setup`.
- [`mcp/README.md`](mcp/README.md): how the local email MCP sends immediate and scheduled emails.

## Privacy

This repository is designed for local use. Job results, profile files, and personal source documents can contain sensitive information.

Keep credentials in environment variables and never commit SMTP passwords or Google app passwords. CVs, resumes, private notes, generated job data, and application materials can be committed to your own private fork if that is your workflow. We recommend avoiding public repositories for personal materials unless they have been intentionally sanitized.

## Current Limitations

- The n8n workflow is expected to exist in your local n8n instance; this repository documents and supports the workflow contract.
- `output/filtered-jobs.json` is generated by the agent filtering step, not directly by the n8n webhook.
- Email sending depends on valid SMTP environment variables and a restarted agent or MCP client session after MCP configuration changes.
