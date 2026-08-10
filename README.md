# WhatsApp Job Search

[![CI](https://github.com/CaioBalieir0/whatsapp-job-search-n8n/actions/workflows/ci.yml/badge.svg)](https://github.com/CaioBalieir0/whatsapp-job-search-n8n/actions/workflows/ci.yml)

*A local job-search assistant that turns WhatsApp job posts into filtered opportunities and ready-to-send application emails.*

WhatsApp Job Search is a local automation workspace built around a small Node.js search CLI, Evolution API, Claude Code commands and skills, and a local email MCP server. It searches recent job postings received through WhatsApp, stores them as structured JSON, filters them against your local candidate profile, and helps send professional application emails through SMTP.

The whole workflow runs on your machine. Your profile, raw job messages, filtered results, and email preferences stay in local files.

## What This Is

This project is not a public job board scraper. It is a personal workflow for job opportunities that already arrive in your WhatsApp channels or groups.

The local stack provides WhatsApp access through Evolution API, while repository code and Claude commands handle the job-search workflow:

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
- Claude Code or a compatible MCP-capable coding assistant that can use the included project commands and skills.
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

Copy the single environment reference and fill in your local values:

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

The same root `.env` file also provides Docker Compose defaults for Postgres, timezone, SMTP, and MCP settings. There is no separate `mcp/.env`; keep all runtime variables in the root `.env`.

Optional email MCP variables:

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP host, for example `smtp.gmail.com`. |
| `SMTP_PORT` | SMTP port, usually `587` or `465`. |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASS` | SMTP password or app password. |
| `SMTP_FROM` | Sender address for outgoing emails. |
| `EMAIL_QUEUE_FILE` | Scheduled email queue path inside the MCP container. Defaults to `/mcp/data/scheduled-emails.json` in Docker. |
| `MCP_AUTH_TOKEN` | Required bearer token for HTTP MCP access. Use a long random value. |
| `MCP_HTTP_BIND` | Host address used by Docker port publishing. Defaults to `127.0.0.1`. |
| `MCP_HTTP_PORT` | Published MCP HTTP port. Defaults to `3333`. |

### 3. Start the local WhatsApp stack

```bash
docker compose up -d
```

The default stack starts:

| Service | Purpose | Local Port |
| --- | --- | --- |
| `postgres` | Persistence for Evolution API. | `5433` by default |
| `redis` | Cache for Evolution API. | Not exposed |
| `evolution-api` | WhatsApp integration service. | `8080` |
The email MCP services are also defined in `docker-compose.yml`, but they are behind the `mcp` Compose profile, so they only start when requested:

| Service | Purpose | Local Port |
| --- | --- | --- |
| `email-mcp` | HTTP email MCP server. | `3333`, bound to `127.0.0.1` by default |
| `email-worker` | Scheduled email queue worker. | Not exposed |

Check the running services with:

```bash
docker compose ps
```

### 4. Create your job profile

Start Claude Code or your compatible agent CLI in this repository and run:

```text
/setup
```

`/setup` creates or refreshes:

- `profile/job-profile.md`: your target roles, skills, preferences, and rejection rules.
- `profile/email-body-rules.md`: your preferred language, tone, structure, and wording for application emails.

You can place CVs, resume PDFs, LinkedIn exports, notes, or other source material in `profile/documents/` before running setup. You can also paste professional context directly into the setup conversation. During setup, attachment paths are optional and may point to files in `profile/documents/` or any other local path you provide.

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

You can also run the MCP through Docker after setting `SMTP_*` and `MCP_AUTH_TOKEN` in `.env`:

```bash
docker compose --profile mcp up -d email-mcp email-worker
```

Check the HTTP MCP health endpoint:

```bash
curl http://127.0.0.1:3333/health
```

Remote MCP clients must connect to the Streamable HTTP endpoint with the bearer token:

```bash
curl -X POST http://127.0.0.1:3333/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## VPS MCP Compose

Use the main `docker-compose.yml` on a VPS and start only the MCP services:

```bash
docker compose --profile mcp up -d email-mcp email-worker
```

That does not start Postgres, Redis, or Evolution API because the command names only `email-mcp` and `email-worker`.

The Compose file publishes the MCP port on `127.0.0.1` by default. To expose it publicly, set `MCP_HTTP_BIND=0.0.0.0` intentionally and use a strong `MCP_AUTH_TOKEN`.

Public exposure is sensitive. Prefer firewall allowlists and TLS/reverse proxy even though the HTTP endpoint requires a bearer token.

## CI

GitHub Actions runs on every push and pull request through `.github/workflows/ci.yml`.

The CI workflow runs:

- `npm run check`
- `npm test`
- `npm --prefix mcp run check`
- `npm --prefix mcp test`

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

## Claude Commands

The project includes these local Claude commands:

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
|-- .claude/
|   |-- commands/                  # Claude slash commands for the workflow
|   `-- skills/                    # Claude skills used by the commands
|-- .github/
|   `-- workflows/
|       `-- ci.yml                 # Push and pull request checks
|-- docker-compose.yml             # Local Postgres, Redis, and Evolution API stack
|-- package.json                   # Root search CLI scripts and tests
|-- opencode.json                  # OpenCode compatibility config pointing at .claude/skills
|-- README.md                      # Project overview and quick start
|-- scripts/
|   |-- search-whatsapp-jobs.mjs   # Local WhatsApp search CLI
|   `-- search-whatsapp-jobs.test.mjs
|-- mcp/
|   |-- Dockerfile                 # Email MCP container image
|   |-- README.md                  # Local email MCP documentation
|   |-- email-server.mjs           # MCP server exposing send_email
|   |-- http-server.mjs            # Authenticated HTTP email MCP server
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
