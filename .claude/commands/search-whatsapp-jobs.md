---
description: Search WhatsApp job postings through the local CLI
argument-hint: "[hours]"
---

Use the `search-whatsapp-jobs` skill from `.claude/skills` to search WhatsApp job postings in this project. Treat `$ARGUMENTS` as the optional hours value. If `$ARGUMENTS` is provided, use it as the CLI hours argument. If it is empty, follow the skill's interactive hours flow. Run the required Docker and local CLI workflow, validate `output/jobs-email.json`, and report `lastRun`, `hoursConsulted`, and `total`.
