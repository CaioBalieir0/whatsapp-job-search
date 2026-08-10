---
description: Search WhatsApp jobs and then filter them against the local profile
argument-hint: "[hours]"
---

Run the full WhatsApp job search pipeline in this project. First use the `search-whatsapp-jobs` skill from `.claude/skills` with `$ARGUMENTS` as the optional hours value. If `$ARGUMENTS` is empty, follow the skill's interactive hours flow. After `output/jobs-email.json` is valid, use the `filter-whatsapp-jobs` skill from `.claude/skills` to read `profile/job-profile.md` and create `output/filtered-jobs.json`. Do not read `profile/documents/` during filtering. Validate both outputs and report `lastRun`, `hoursConsulted`, `sourceTotal`, `total`, and the output paths.
