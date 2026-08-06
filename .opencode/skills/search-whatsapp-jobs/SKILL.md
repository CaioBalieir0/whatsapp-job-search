---
name: search-whatsapp-jobs
description: Use when the user asks to search WhatsApp job postings, check received job opportunities by time window, run the buscar-vagas webhook, or verify output/jobs-email.json in this n8n project.
---

# Search WhatsApp Jobs

## Overview

Use the existing n8n webhook to search job messages received through WhatsApp. Do not inspect n8n execution history, databases, WhatsApp directly, Docker volumes, or Evolution API internals unless the webhook/output flow fails and the user explicitly asks to debug it.

## Required Workflow

1. Check containers with `docker compose ps`.
2. If required services are not running, start them with `docker compose up -d` and wait until n8n is reachable on port `5678`.
3. Determine the `hours` value before calling the webhook.
4. Call `POST http://localhost:5678/webhook/buscar-vagas` with JSON body `{"hours": <hours>}`.
5. Read and validate `output/jobs-email.json`.
6. Report the last run, consulted hours, and total jobs found.

## Choosing Hours

If the user explicitly gives a time window, use it. Examples: "last 2 hours" means `{"hours": 2}`; "last 24 hours" means `{"hours": 24}`.

If the user does not provide hours, read `output/jobs-email.json` first when it exists and ask interactively:

```text
Which period do you want to search?
1. Last 24 hours
2. Another value in hours

Last run: <lastRun, or "not found">
Hours consulted in the last run: <hoursConsulted, or "not found">
```

If they choose another value, ask them to type the number of hours. Use only positive numbers; if the value is invalid, ask again instead of guessing.

## Commands

Check containers:

```bash
docker compose ps
```

Start containers if needed:

```bash
docker compose up -d
```

Check whether n8n is reachable before calling the webhook:

```bash
curl -fsS http://localhost:5678/ >/dev/null
```

Call the webhook:

```bash
curl -X POST http://localhost:5678/webhook/buscar-vagas \
  -H "Content-Type: application/json" \
  -d '{"hours": 24}'
```

Replace `24` with the selected `hours` value.

## Output File

Inside the n8n container, the workflow writes to:

```text
/data/output/jobs-email.json
```

The project mount exposes that file locally as:

```text
output/jobs-email.json
```

After the curl call, verify all of these before reporting success:

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

If any check fails, say the webhook did not produce the expected output and ask whether the user wants to debug the n8n workflow.

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
| "search jobs" without hours | Ask the interactive hours question and include last run info |
| "last 2 hours" | Use `{"hours": 2}` immediately |
| Containers down | Run `docker compose up -d`, then call the webhook |
| `output/jobs-email.json` missing, empty, invalid, or missing the expected top-level or job fields | Say the webhook did not produce the expected output and suggest debugging the n8n workflow |
| `total` is `0` | Report that the run completed with zero jobs |

## Common Mistakes

- Do not query Postgres, SQLite, n8n execution tables, or Docker volumes to search messages.
- Do not call Evolution API directly.
- Do not invent a default when hours are missing; ask the user and show last run context.
- Do not report success only from the curl response; verify `output/jobs-email.json` afterward.
- Do not use legacy output fields; the n8n code now writes `lastRun`, `hoursConsulted`, `total`, and `jobs`.
