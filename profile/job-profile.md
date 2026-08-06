# Job Profile

Use this file to describe which WhatsApp job postings should be kept in `output/filtered-jobs.json`.

Replace the bracketed placeholders with your real preferences. Remove lines that do not apply.

This file is the only profile source used by the filtering skill. To generate or refresh it from a CV, LinkedIn export, notes, or an interview flow, run `/setup`.

## Target Roles

- [Backend Developer]
- [Full Stack Developer]
- [Technical Lead]

## Seniority

- [Senior]
- [Specialist]
- [Lead]

## Strong Matches

- [Node.js]
- [TypeScript]
- [APIs]
- [Relational databases]
- [Containers]

## Acceptable Matches

- [A secondary technology, only when the role still matches the target direction]
- [A secondary domain, only when the role is aligned with the target responsibilities]

## Reject

- [Roles outside the target career path]
- [Technologies you do not want to work with]
- [Support-only roles]
- [Entry-level roles, if not applicable]
- [On-site only roles, if not applicable]

## Work Preferences

- [Remote preferred]
- [Hybrid accepted only in selected locations]
- [On-site accepted only in selected locations]

## Contract Preferences

- [Full-time employment accepted]
- [Contract work accepted]
- [Freelance accepted only for selected projects]
- [Part-time accepted only if applicable]

## Language Requirements

- [English accepted]
- [Local language accepted]
- [Additional languages accepted only if optional]

## Decision Rules

- [Exclude weak or ambiguous matches]
- Keep only jobs that clearly match this profile.
- Exclude jobs when the match is weak or ambiguous.
- Exclude jobs that match any explicit rejection rule.
- The filtered output must always set `send: false` for every kept job.
