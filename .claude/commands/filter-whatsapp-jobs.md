---
description: Filter WhatsApp job postings against the local job profile
---

Use the `filter-whatsapp-jobs` skill from `.claude/skills` to filter `output/jobs-email.json` against `profile/job-profile.md`. Do not read `profile/documents/` or any resumes, CVs, LinkedIn exports, or supplemental files while filtering. Write `output/filtered-jobs.json` with only compatible jobs, preserve `sender`, `text`, and `timestamp`, add `send: false` to every kept job, never set `send: true`, do not add `reason`, do not modify `output/jobs-email.json`, validate the result, and report `sourceTotal`, `total`, and the output path.
