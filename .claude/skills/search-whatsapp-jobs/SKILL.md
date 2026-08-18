---
name: search-whatsapp-jobs
description: Use when the user asks to search WhatsApp job postings, check received job opportunities by time window, run the local WhatsApp search CLI, or verify output/jobs-email.json in this project.
---

# Search WhatsApp Jobs

## Overview

Use the local CLI to search job messages received through WhatsApp. The CLI calls Evolution API directly, filters recent messages, and writes `output/jobs-email.json`.

Do not inspect databases, WhatsApp directly, Docker volumes, or Evolution API internals. Manual Evolution API calls are allowed only for the normal pre-search connection check described below.

## Required Workflow

1. Check containers with `docker compose ps`.
2. If required services are not running, start them with `docker compose up -d` and wait until Evolution API is reachable.
3. Verify the configured Evolution API instance is connected to WhatsApp.
4. If the instance is disconnected, help the user generate the Evolution API QR Code, ask them to scan it in WhatsApp, and stop before searching.
5. Determine the `hours` value before running the CLI.
6. Run `npm run search -- <hours>`.
7. Read and validate `output/jobs-email.json`.
8. Report the last run, consulted hours, and total jobs found.

## WhatsApp Connection Check

Before choosing hours or running the CLI, confirm WhatsApp is connected through Evolution API.

Load root `.env` values first. Required for this check:

| Variable | Purpose |
| --- | --- |
| `EVOLUTION_API_URL` | Evolution API base URL, for example `http://localhost:8080`. |
| `EVOLUTION_API_KEY` | API key used as the `apikey` header. |
| `EVOLUTION_INSTANCE` | Evolution API instance name. |

If any variable is missing, stop and tell the user exactly which variables are missing. Point them to `.env.example`.

Check Evolution API reachability using the configured URL:

```bash
curl -fsS "$EVOLUTION_API_URL" >/dev/null
```

If it is not reachable, run `docker compose up -d`, then retry the reachability check. If it still fails, stop and report that Evolution API did not become reachable.

Check whether the instance is connected:

```bash
curl -fsS -H "apikey: $EVOLUTION_API_KEY" "$EVOLUTION_API_URL/instance/connectionState/$EVOLUTION_INSTANCE"
```

Treat `open` as connected. If the response shows another state, no state, a missing instance, or a non-2xx status, do not run `npm run search` yet.

If the instance is missing, create it with the configured instance name:

```bash
curl -fsS -X POST "$EVOLUTION_API_URL/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d "{\"instanceName\":\"$EVOLUTION_INSTANCE\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}"
```

Then request the QR Code:

```bash
curl -fsS -H "apikey: $EVOLUTION_API_KEY" "$EVOLUTION_API_URL/instance/connect/$EVOLUTION_INSTANCE"
```

Show the QR Code or QR Code data returned by Evolution API to the user. Tell them to open WhatsApp, go to linked devices, scan the QR Code, and rerun `/search-whatsapp-jobs <hours>` after the phone is connected. Stop after presenting the QR Code; do not continue to the search CLI in the same run.

If QR Code generation fails, report the endpoint, HTTP status, and response body when available. Do not inspect databases, Docker volumes, or WhatsApp internals.

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

Use `$EVOLUTION_API_URL` instead when it is configured.

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
- Do not call Evolution API manually for message searching when the CLI is available. Manual Evolution API calls are allowed for the pre-search `connectionState` and `instance/connect` QR Code setup flow.
- Do not invent a default when hours are missing; ask the user and show last run context.
- Do not report success only from the CLI exit code; verify `output/jobs-email.json` afterward.
- Do not use legacy output fields; the CLI writes `lastRun`, `hoursConsulted`, `total`, and `jobs`.
