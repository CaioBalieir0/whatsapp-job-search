---
description: Generate or refresh profile/job-profile.md and profile/email-body-rules.md from onboarding information
argument-hint: "[--section <name>]"
---

Use the `setup-job-profile` skill from `.claude/skills` to run profile onboarding for this WhatsApp job search project. Pass `$ARGUMENTS` through to the skill, including optional `--section <name>`. Ask for optional attachment paths for CVs, resumes, portfolios, or other application files; paths may be under `profile/documents/` or any local path the user provides. Generate or refresh `profile/job-profile.md` and `profile/email-body-rules.md` only after user confirmation.
