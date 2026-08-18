---
description: Search WhatsApp job postings through the local CLI
argument-hint: "[hours]"
---

Use the `search-whatsapp-jobs` skill from `.claude/skills` to search WhatsApp job postings in this project. Before running the search CLI, verify the Evolution API instance is connected to WhatsApp; if it is disconnected or missing, follow the skill's QR Code setup flow and stop before searching. Treat `$ARGUMENTS` as the optional hours value. If `$ARGUMENTS` is provided, use it as the CLI hours argument after WhatsApp is connected. If it is empty, follow the skill's interactive hours flow after WhatsApp is connected. Run the required Docker and local CLI workflow, validate `output/jobs-email.json`, and report `lastRun`, `hoursConsulted`, and `total`.
