---
description: Reset local job profile data before running setup again
argument-hint: "[profile|documents|all]"
---

Use the `reset-job-profile` skill from `.claude/skills` to reset local job profile data in this WhatsApp job search project. Pass `$ARGUMENTS` through as the optional scope: `profile`, `documents`, or `all`. The `profile` scope resets `profile/job-profile.md` and `profile/email-body-rules.md`. Do not modify or delete anything until the user confirms by typing exactly `RESET`.
