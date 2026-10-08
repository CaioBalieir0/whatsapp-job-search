---
description: Search WhatsApp jobs and then filter them against the local profile
argument-hint: "[hours]"
---

Run the WhatsApp job search and filter pipeline in this project. First use the `search-whatsapp-jobs` skill from `.claude/skills` with `$ARGUMENTS` as the optional hours value to search messages from the configured source JIDs. If `$ARGUMENTS` is empty, follow the skill's interactive hours flow. After `output/jobs-email.json` is valid, use the `filter-whatsapp-jobs` skill from `.claude/skills` to read `profile/job-profile.md` and create `output/filtered-jobs.json` with `send: false` and boolean `hasEmail` on every kept job. Do not read `profile/documents/` during filtering. Do not send emails in this pipeline. Validate both outputs and report `lastRun`, `hoursConsulted`, `sourceTotal`, `total`, the count with `hasEmail: true`, and the output paths.
