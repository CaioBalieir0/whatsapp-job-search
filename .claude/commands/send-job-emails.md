---
description: Send job application emails for filtered WhatsApp jobs or direct job text through the email MCP
argument-hint: "[confirm|auto] [index ...|job text]"
---

Use the `send-job-emails` skill from `.claude/skills` to send professional job application emails. Pass `$ARGUMENTS` through as the optional send mode (`confirm` or `auto`) plus optional job target. If no target is provided, process pending jobs from `output/filtered-jobs.json`. If the target is only positive integers, process those 1-based indexes from `output/filtered-jobs.json`. If the target contains text, treat it as direct job text and do not update `output/filtered-jobs.json`. Use `confirm` mode to build and show the batch before sending. Use `auto` mode to send automatically after validation. Read `profile/job-profile.md` for candidate details and `profile/email-body-rules.md` for email language, tone, structure, and wording preferences. Never read `profile/documents/`, never modify `output/jobs-email.json`, use the email MCP `send_email` tool for sending, and mark file jobs as `send: true` in `output/filtered-jobs.json` only after successful MCP sends.
