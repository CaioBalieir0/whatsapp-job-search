---
description: Send job application emails for filtered WhatsApp jobs through the email MCP
argument-hint: "[confirm|auto]"
---

Use the `send-job-emails` skill from `.claude/skills` to send professional job application emails for jobs in `output/filtered-jobs.json`. Pass `$ARGUMENTS` through as the send mode: `confirm` or `auto`. Use `confirm` mode to build and show the batch before sending. Use `auto` mode to send automatically after validation. Read `profile/job-profile.md` for candidate details and `profile/email-body-rules.md` for email language, tone, structure, and wording preferences. Never read `profile/documents/`, never modify `output/jobs-email.json`, use the email MCP `send_email` tool for sending, and mark jobs as `send: true` in `output/filtered-jobs.json` only after successful MCP sends.
