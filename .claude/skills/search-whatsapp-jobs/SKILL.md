---
name: search-whatsapp-jobs
description: Use when the user asks to search WhatsApp job postings, check received job opportunities by time window, run the local WhatsApp search CLI, or verify output/jobs-email.json in this project.
---

# Search WhatsApp Jobs

## Overview

Use the local CLI to search job messages received through WhatsApp. The CLI calls Evolution API directly, filters recent messages, and writes `output/jobs-email.json`.

Do not inspect databases, WhatsApp directly, Docker volumes, or Evolution API internals unless the CLI/output flow fails and the user explicitly asks to debug it.

## Required Workflow

1. Check containers with `docker compose ps`.
2. If required services are not running, start them with `docker compose up -d` and wait until Evolution API is reachable on port `8080`.
3. Determine the `hours` value before running the CLI.
4. Run `npm run search -- <hours>`.
5. Read and validate `output/jobs-email.json`.
6. Report the last run, consulted hours, and total jobs found.

## Choosing Hours

If the user explicitly gives a time window, use it. Examples: "last 2 hours" means `npm run search -- 2`; "last 24 hours" means `npm run search -- 24`.

If the user does not provide hours, read `output/jobs-email.json` first when it exists and ask interactively:

```text
Which period do you want to search?
1. Last 24 hours
2. Another value in hours

Last run: <lastRun, or "not found">
Hours consulted in the last run: <hoursConsulted, or "not found">
```

If they choose another value, ask them to type the number of hours. Use only positive numbers; if the value is invalid, ask again instead of guessing.

## Configuration

The CLI loads root `.env` automatically. Required variables:

| Variable | Purpose |
| --- | --- |
| `EVOLUTION_API_URL` | Evolution API base URL, for example `http://localhost:8080`. |
| `EVOLUTION_API_KEY` | API key used as the `apikey` header. |
| `EVOLUTION_INSTANCE` | Evolution API instance name. |
| `WHATSAPP_GROUP_JID` | WhatsApp group JID to search. |

Optional variable:

| Variable | Purpose |
| --- | --- |
| `JOBS_OUTPUT_FILE` | Output path. Defaults to `output/jobs-email.json`. |

Use `.env.example` as the reference for safe placeholder values.

## Commands

Check containers:

```bash
docker compose ps
```

Start containers if needed:

```bash
docker compose up -d
```

Check whether Evolution API is reachable before running the CLI:

```bash
curl -fsS http://localhost:8080/ >/dev/null
```

Run the search CLI:

```bash
npm run search -- 24
```

Replace `24` with the selected `hours` value.

## Output File

The CLI writes to:

```text
output/jobs-email.json
```

After the CLI runs, verify all of these before reporting success:

- The file exists.
- The file is not empty.
- The file is valid JSON.
- The JSON contains `lastRun` as a string.
- The JSON contains `hoursConsulted` as a number.
- The JSON contains `total` as a number.
- The JSON contains `jobs` as an array.
- Every item in `jobs` contains `sender` as a string.
- Every item in `jobs` contains `text` as a string.
- Every item in `jobs` contains `timestamp` as a number.

If any check fails, say the CLI did not produce the expected output and ask whether the user wants to debug the local search flow.

One direct validation command:

```bash
node -e 'const fs=require("fs"); const p="output/jobs-email.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); if (typeof j.lastRun !== "string" || typeof j.hoursConsulted !== "number" || typeof j.total !== "number" || !Array.isArray(j.jobs)) process.exit(1); if (j.jobs.some((job)=>typeof job.sender !== "string" || typeof job.text !== "string" || typeof job.timestamp !== "number")) process.exit(1); console.log(JSON.stringify({ lastRun: j.lastRun, hoursConsulted: j.hoursConsulted, total: j.total }, null, 2));'
```

Expected output fields:

| Meaning | Field |
| --- | --- |
| Last run | `lastRun` |
| Hours consulted | `hoursConsulted` |
| Total found | `total` |
| Jobs | `jobs` |
| Job sender | `jobs[].sender` |
| Job text | `jobs[].text` |
| Job timestamp | `jobs[].timestamp` |

Report empty results clearly: "The file was written, but no jobs were found for the consulted time window."

## Quick Reference

| User request | Action |
| --- | --- |
| "search jobs" without hours | Ask the interactive hours question and include last run info. |
| "last 2 hours" | Run `npm run search -- 2` immediately. |
| Containers down | Run `docker compose up -d`, then run the CLI. |
| `output/jobs-email.json` missing, empty, invalid, or missing the expected top-level or job fields | Say the CLI did not produce the expected output and suggest debugging the local search flow. |
| `total` is `0` | Report that the run completed with zero jobs. |

## Common Mistakes

- Do not query Postgres, SQLite, databases, or Docker volumes to search messages.
- Do not call Evolution API manually when the CLI is available.
- Do not invent a default when hours are missing; ask the user and show last run context.
- Do not report success only from the CLI exit code; verify `output/jobs-email.json` afterward.
- Do not use legacy output fields; the CLI writes `lastRun`, `hoursConsulted`, `total`, and `jobs`.
