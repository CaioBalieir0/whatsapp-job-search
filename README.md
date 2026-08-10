# WhatsApp Job Search

*A local job-search assistant that turns WhatsApp job posts into filtered opportunities and ready-to-send application emails.*

WhatsApp Job Search is a local automation workspace built around a small Node.js search CLI, Evolution API, agent commands, and a local email MCP server. It searches recent job postings received through WhatsApp, stores them as structured JSON, filters them against your local candidate profile, and helps send professional application emails through SMTP.

The whole workflow runs on your machine. Your profile, raw job messages, filtered results, and email preferences stay in local files.

## What This Is

This project is not a public job board scraper. It is a personal workflow for job opportunities that already arrive in your WhatsApp channels or groups.

The local stack provides WhatsApp access through Evolution API, while repository code and agent commands handle the job-search workflow:

- Generate or refresh your job-search profile.
- Search recent WhatsApp job posts through the local Node.js CLI.
- Filter jobs against your target roles, technologies, work mode, seniority, language, and rejection rules.
- Build professional application emails from the filtered jobs.
- Send emails through a local MCP server only after the configured command flow validates them.

```text
WhatsApp job messages
  -> Evolution API
  -> local search CLI
  -> output/jobs-email.json
  -> profile-based filtering
  -> output/filtered-jobs.json
  -> email draft and send through MCP
```

## Prerequisites

- [Docker](https://www.docker.com/) with Docker Compose.
- An agent CLI or MCP-capable coding assistant that can use the included project commands and skills.
- Node.js and npm for the local search CLI and email MCP server.
- A configured Evolution API instance connected to WhatsApp.
- Optional email sending: SMTP credentials, for example a Gmail address plus a Google app password.

## Quick Start

### 1. Fork and clone

Create your own fork before adding profile data, documents, or credentials:

```bash
git clone <your-private-fork-url>
cd <your-repository-folder>
```

Recommended: use a private fork or private repository if you plan to store CVs, resumes, personal notes, generated job data, or application materials in Git.

### 2. Configure environment variables

Copy the root environment reference and fill in your local values:

```bash
cp .env.example .env
```

Required search variables:

| Variable | Purpose |
| --- | --- |
| `EVOLUTION_API_URL` | Evolution API base URL, for example `http://localhost:8080`. |
| `EVOLUTION_API_KEY` | API key used by Evolution API and the search CLI. |
| `EVOLUTION_INSTANCE` | Evolution API instance name. |
| `WHATSAPP_GROUP_JID` | WhatsApp group JID to search. |
| `JOBS_OUTPUT_FILE` | Output path for raw search results. Defaults to `output/jobs-email.json`. |

The same `.env` file also provides Docker Compose defaults for Postgres and timezone settings.

### 3. Start the local WhatsApp stack

```bash
docker compose up -d
```

The stack starts:

| Service | Purpose | Local Port |
| --- | --- | --- |
| `postgres` | Persistence for Evolution API. | `5433` by default |
| `redis` | Cache for Evolution API. | Not exposed |
| `evolution-api` | WhatsApp integration service. | `8080` |

Check the running services with:

```bash
docker compose ps
```

### 4. Create your job profile

Start your agent CLI in this repository and run:

```text
/setup
```

`/setup` creates or refreshes:

- `profile/job-profile.md`: your target roles, skills, preferences, and rejection rules.
- `profile/email-body-rules.md`: your preferred language, tone, structure, and wording for application emails.

You can place CVs, resume PDFs, LinkedIn exports, notes, or other source material in `profile/documents/` before running setup. You can also paste professional context directly into the setup conversation.

See [`profile/README.md`](profile/README.md) and [`profile/documents/README.md`](profile/documents/README.md) for the profile workflow.

### 5. Search recent WhatsApp jobs

Run the search command with a time window in hours:

```text
/search-whatsapp-jobs 24
```

Under the hood, the command runs the local CLI:

```bash
npm run search -- 24
```

The CLI calls Evolution API directly, filters recent messages that contain application contact text, and writes `output/jobs-email.json`.

### 6. Filter jobs against your profile

```text
/filter-whatsapp-jobs
```

This reads `profile/job-profile.md`, filters `output/jobs-email.json`, and writes compatible jobs to `output/filtered-jobs.json`. Every kept job starts with `send: false`.

You can run search and filter together with:

```text
/job-search-pipeline 24
```

### 7. Send application emails

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

## CLI Commands

Run the search directly without an agent command:

```bash
npm run search -- 24
```

Run CLI tests:

```bash
npm test
```

Check JavaScript syntax:

```bash
npm run check
```

## Agent Commands

The project includes these local agent commands:

| Command | Example | Purpose |
| --- | --- | --- |
| `/setup` | `/setup` | Generate or refresh `profile/job-profile.md` and `profile/email-body-rules.md`. |
| `/reset` | `/reset profile` | Reset profile files, documents, or both after explicit confirmation. |
| `/search-whatsapp-jobs` | `/search-whatsapp-jobs 24` | Search WhatsApp jobs through the local CLI for the provided number of hours. |
| `/filter-whatsapp-jobs` | `/filter-whatsapp-jobs` | Filter raw jobs against the local profile. |
| `/job-search-pipeline` | `/job-search-pipeline 24` | Run search and filtering in one flow. |
| `/send-job-emails` | `/send-job-emails confirm` | Send application emails for filtered jobs through the email MCP. |

## Project Structure

```text
.
|-- .env.example                   # Root Evolution API and search CLI environment reference
|-- docker-compose.yml             # Local Postgres, Redis, and Evolution API stack
|-- package.json                   # Root search CLI scripts and tests
|-- README.md                      # Project overview and quick start
|-- scripts/
|   |-- search-whatsapp-jobs.mjs   # Local WhatsApp search CLI
|   `-- search-whatsapp-jobs.test.mjs
|-- mcp/
|   |-- README.md                  # Local email MCP documentation
|   |-- email-server.mjs           # MCP server exposing send_email
|   |-- email-worker.mjs           # Scheduled email queue worker
|   `-- package.json               # MCP scripts and dependencies
|-- output/
|   |-- jobs-email.json            # Raw job-search output from the local CLI
|   `-- filtered-jobs.json         # Profile-filtered jobs and send status
`-- profile/
    |-- README.md                  # Profile usage and editing guide
    |-- job-profile.md             # Local source of truth for filtering
    |-- email-body-rules.md        # Local source of truth for email wording
    `-- documents/
        `-- README.md              # Optional setup source-material guide
```

## Technical Docs

- [`profile/README.md`](profile/README.md): how the candidate profile and email body rules work.
- [`profile/documents/README.md`](profile/documents/README.md): how to provide source material for `/setup`.
- [`mcp/README.md`](mcp/README.md): how the local email MCP sends immediate and scheduled emails.

## Privacy

This repository is designed for local use. Job results, profile files, and personal source documents can contain sensitive information.

Keep credentials in environment variables and never commit API keys, SMTP passwords, or Google app passwords. CVs, resumes, private notes, generated job data, and application materials can be committed to your own private fork if that is your workflow. We recommend avoiding public repositories for personal materials unless they have been intentionally sanitized.

## Current Limitations

- WhatsApp search depends on a valid Evolution API instance and a connected WhatsApp session.
- `output/filtered-jobs.json` is generated by the agent filtering step, not directly by the search CLI.
- Email sending depends on valid SMTP environment variables and a restarted agent or MCP client session after MCP configuration changes.
