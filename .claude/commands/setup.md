---
description: Generate or refresh profile files and optionally configure WhatsApp source JIDs
argument-hint: "[--section <name>]"
---

Use the `setup-job-profile` skill from `.claude/skills` to run onboarding for this WhatsApp job search project. Pass `$ARGUMENTS` through to the skill, including optional `--section <name>`. Ask for optional attachment paths for CVs, resumes, portfolios, or other application files; paths may be under `profile/documents/` or any local path the user provides. Generate or refresh `profile/job-profile.md`, `profile/email-body-rules.md`, and `profile/whatsapp-sources.json` only after user confirmation. When configuring WhatsApp sources, help the user connect WhatsApp through the Evolution API QR Code flow and identify group or direct-chat JIDs for `profile/whatsapp-sources.json`.
