---
name: send-job-emails
description: Use when the user asks to send job application emails for filtered WhatsApp jobs, direct job texts, output/filtered-jobs.json, or the email MCP tool in this project.
---
# Send Job Emails

## Overview

Send professional job application emails for compatible jobs already filtered into `output/filtered-jobs.json`, selected by index from that file, or provided directly in the command. Use `profile/job-profile.md` for candidate details, `profile/email-body-rules.md` for email writing preferences, and the local email MCP tool to send email.

Do not search WhatsApp, run the WhatsApp search CLI, filter jobs, read `profile/documents/`, or modify `output/jobs-email.json`.

## Required Workflow

1. Parse `$ARGUMENTS` into send mode and optional job target: `confirm` or `auto`, then indexes or direct job text.
2. Read `profile/job-profile.md`.
3. Read `profile/email-body-rules.md`.
4. If no direct job text was provided, read and validate `output/filtered-jobs.json`.
5. Select jobs from the requested source, processing only file jobs where `send` is `false`.
6. For each selected job, analyze the selected job text for application email instructions.
7. Build sendable drafts only when all required data is clear.
8. In `confirm` mode, show the full batch of drafts and wait for approval before sending.
9. In `auto` mode, send without draft approval after validation.
10. Send with the MCP email tool `send_email`.
11. For file jobs, mark `send: true` only after a successful MCP response.
12. Validate `output/filtered-jobs.json` after updates when file jobs were sent.
13. Report `eligible`, `skipped`, `sent`, `failed`, and the output path.

## Mode Selection

Accepted modes:

| Mode        | Behavior                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| `confirm` | Build every sendable draft, show the batch, and wait for explicit approval before sending. |
| `auto`    | Send every sendable draft automatically after validation.                                  |

If `$ARGUMENTS` contains `confirm`, use confirm mode. If `$ARGUMENTS` contains `auto`, use auto mode.

If no mode is provided, ask the user to choose:

```markdown
Choose an email sending mode:

- `confirm` - preview the batch before sending.
- `auto` - send automatically after validation.
```

Do not guess the mode when it is missing.

## Job Target Selection

After removing the optional send mode from `$ARGUMENTS`, interpret the remaining arguments as the job target.

Supported target forms:

| Target form | Example | Behavior |
| --- | --- | --- |
| Empty | `/send-job-emails confirm` | Read `output/filtered-jobs.json` and process every job where `send` is `false`. |
| Numeric indexes | `/send-job-emails confirm 1 3 5` | Read `output/filtered-jobs.json` and process only those 1-based job indexes when their `send` value is `false`. |
| Direct job text | `/send-job-emails confirm vaga backend... enviar CV para jobs@example.com` | Treat the remaining text as one or more temporary jobs provided directly by the user. |

Rules:

- Treat targets as numeric indexes only when every remaining argument is a positive integer.
- Indexes are 1-based and refer to the order of `jobs` in `output/filtered-jobs.json`.
- If any index is out of range, skip it and report `invalid job index`.
- If the remaining arguments contain non-numeric text, treat all remaining text as direct job text.
- For direct job text, create temporary job objects with the provided text, `sender: "direct input"`, and `send: false`. A timestamp is not required for sending logic.
- Do not read or validate `output/filtered-jobs.json` when processing only direct job text.
- Do not update `output/filtered-jobs.json` for direct job text, even after successful sends.
- If direct job text appears to include multiple postings, split only on clear separators such as blank lines between postings. Do not split aggressively when uncertain.

## Inputs

Profile file:

```text
profile/job-profile.md
```

Email body rules file:

```text
profile/email-body-rules.md
```

Source file:

```text
output/filtered-jobs.json
```

`output/filtered-jobs.json` must contain:

- `lastRun` as a string.
- `hoursConsulted` as a number.
- `sourceTotal` as a number.
- `total` as a number.
- `jobs` as an array.
- Every item in `jobs` must contain `sender` as a string.
- Every item in `jobs` must contain `text` as a string.
- Every item in `jobs` must contain `timestamp` as a number.
- Every item in `jobs` must contain `send` as a boolean.

Only process file jobs where `send` is `false`. Ignore file jobs where `send` is `true`. Direct job text is always treated as pending because it is not stored in `output/filtered-jobs.json`.

## Profile Rules

Use `profile/job-profile.md` as the only candidate facts source.

Use `profile/email-body-rules.md` as the only email body language, tone, structure, and wording preference source.

Look for explicit profile content that identifies:

- Candidate name.
- Professional summary or experience paragraph.
- Custom signature.
- Attachment paths for CV, resume, portfolio, or other files. Paths may be relative to the repository or absolute local paths.
- Location, availability, salary expectation, language level, or other application facts when a job specifically asks for them.

Do not read `profile/documents/`, resumes, CVs, LinkedIn exports, or supplemental files while sending emails.

If a required candidate detail is missing from `profile/job-profile.md`, skip the job instead of inventing it. In `confirm` mode, you may mention that the missing detail can be added to `profile/job-profile.md` before rerunning the command.

If `profile/email-body-rules.md` is missing or does not contain language and body structure preferences, skip sending and ask the user to run `/setup` or edit `profile/email-body-rules.md`.

## Email Extraction Rules

Extract email addresses only from the selected job text.

Send only when the email appears related to job applications. Prefer email addresses near words such as:

- `curriculo`
- `currículo`
- `cv`
- `vaga`
- `candidatura`
- `resume`
- `apply`
- `recrutamento`
- `recruiter`
- `talentos`

Skip the job when:

- No email exists in the job text.
- The email is ambiguous or unrelated to applications.
- Multiple emails exist and the correct recipient is unclear.
- The job directs candidates to apply only through a form, link, platform, or WhatsApp instead of email.

Do not send to guessed, inferred, normalized, or corrected email addresses. Use only the exact email from `jobs[].text`.

## Instruction Extraction Rules

Follow instructions from the job text before using defaults.

Required behavior:

- If the job specifies an email subject, use that subject exactly.
- If the job specifies body content, include that content and do not contradict it.
- If the job asks for salary expectation, availability, location, language level, or another fact not present in `profile/job-profile.md`, skip the job.
- If no subject is specified, create a professional subject from the role when the role can be identified.
- If no role can be identified, use `Candidatura para vaga`.

Common subject instruction patterns include:

- `assunto:`
- `subject:`
- `enviar com o assunto`
- `colocar no assunto`
- `título do email`

Common attachment instruction patterns include:

- `enviar currículo`
- `enviar curriculo`
- `send resume`
- `anexar CV`
- `com currículo em anexo`

## Email Body Rules

Read `profile/email-body-rules.md` before generating any draft body.

Use this precedence order:

1. Explicit job instructions from `jobs[].text`.
2. Language, tone, structure, and wording preferences from `profile/email-body-rules.md`.
3. Candidate facts from `profile/job-profile.md`.

The email body rules file should stay in English where possible, but it may define fallback structures for Portuguese or other languages. It must include the user's language preferences, including preferred email language and when to match the job posting language.

Expected sections in `profile/email-body-rules.md` include `Language Preferences`, `Tone`, `Default Structure`, `Job-Specific Instructions`, `Attachment Wording`, and `Avoid`.

Rules:

- Include job-specific required body content before optional personalization.
- Keep the body plain text.
- Do not invent candidate name, experience, salary expectation, availability, address, phone, links, signature, language preferences, or body template content.
- Do not include a fake attachment statement when no attachment is sent.
- If the job asks for a specific language, use that language only when it does not conflict with `profile/job-profile.md` language facts.

## Attachments

Use attachment paths only when they are explicitly configured in `profile/job-profile.md`. Bracketed placeholder examples such as `[CV or resume path]` are not configured paths.

If a job asks for an attachment:

1. Find a matching attachment path in `profile/job-profile.md`.
2. Verify the file exists before sending.
3. Pass the path through the MCP `attachments` field.
4. Skip the job if the path is missing, still a placeholder, or the file does not exist.

If a job does not ask for an attachment, send with `attachments: []`.

Do not read attachment contents. Only verify that the path exists.

## MCP Tool Call

Use the local email MCP tool. Depending on the client, this may be exposed as a tool named like `email_send_email`; the MCP tool itself is `send_email` under the configured `email` server.

Call it with:

```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "body": "Plain text email body",
  "attachments": []
}
```

Do not pass `schedule` unless the user explicitly asks for scheduling.

Treat tool errors, rejected recipients, or missing accepted recipients as failures. Do not mark failed jobs as sent.

## Updating `output/filtered-jobs.json`

After a successful send for a job selected from `output/filtered-jobs.json`, update only the matching job's `send` value from `false` to `true`.

Do not update `output/filtered-jobs.json` after sending direct job text provided in `$ARGUMENTS`.

Do not change:

- `lastRun`
- `hoursConsulted`
- `sourceTotal`
- `total`
- `sender`
- `text`
- `timestamp`

Do not add fields such as `reason`, `score`, `email`, `subject`, `body`, `sentAt`, or `messageId`.

Never modify `output/jobs-email.json`.

## Validation

Validate `output/filtered-jobs.json` before sending and after updates:

```bash
node -e 'const fs=require("fs"); const p="output/filtered-jobs.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); if (typeof j.lastRun !== "string" || typeof j.hoursConsulted !== "number" || typeof j.sourceTotal !== "number" || typeof j.total !== "number" || !Array.isArray(j.jobs)) process.exit(1); if (j.total !== j.jobs.length) process.exit(1); if (j.jobs.some((job)=>typeof job.sender !== "string" || typeof job.text !== "string" || typeof job.timestamp !== "number" || typeof job.send !== "boolean" || Object.prototype.hasOwnProperty.call(job,"reason"))) process.exit(1); console.log(JSON.stringify({ sourceTotal: j.sourceTotal, total: j.total, pending: j.jobs.filter((job)=>job.send === false).length, sent: j.jobs.filter((job)=>job.send === true).length }, null, 2));'
```

If validation fails before sending, stop and report that `output/filtered-jobs.json` is invalid. Do not try to repair unrelated structure unless the user asks.

## Draft Batch Format For Confirm Mode

Before sending in `confirm` mode, show:

```markdown
## Email Drafts

1. Recipient: candidate@example.com
   Subject: Candidatura para vaga de Backend Developer
   Attachments: [profile/documents/cv.pdf]
   Body:
   ```text
   Prezados,

   Gostaria de me candidatar à vaga de Backend Developer.
   ...
```

Skipped:

- Job 2: missing email
- Job 3: attachment not found

```

Ask for explicit approval before sending. If the user does not approve, do not send and do not mark any job as sent.

## Reporting

At the end, report:

- `eligible`: number of jobs initially found with `send: false`.
- `skipped`: number skipped before sending.
- `sent`: number successfully sent.
- `failed`: number that failed during MCP send.
- `output`: `output/filtered-jobs.json`.

Use short skipped reasons:

- `missing email`
- `ambiguous email`
- `missing required subject data`
- `missing profile summary`
- `missing email body rules`
- `missing attachment path`
- `attachment not found`
- `requires unknown candidate data`
- `apply method is not email`

## Quick Reference

| Situation | Action |
| --- | --- |
| `send` is `true` on a file job | Ignore the job |
| `send` is `false` and email is clear | Build a draft |
| Direct job text is provided | Build drafts from the text and do not update `output/filtered-jobs.json` |
| `profile/email-body-rules.md` is missing or incomplete | Skip sending and ask the user to run `/setup` or edit the file |
| Job specifies subject | Use the exact subject |
| Job asks for an attachment | Use only paths from `profile/job-profile.md` and verify existence |
| Attachment missing | Skip the job |
| MCP send succeeds | Mark that job `send: true` |
| MCP send fails | Keep that job `send: false` |
| Mode is missing | Ask for `confirm` or `auto` |

## Common Mistakes

- Do not read `profile/documents/` while sending emails.
- Do not embed a hard-coded email body template when `profile/email-body-rules.md` provides the user's preferences.
- Do not send jobs outside `output/filtered-jobs.json` unless they were provided directly in `$ARGUMENTS`.
- Do not send jobs already marked with `send: true`.
- Do not modify `output/jobs-email.json`.
- Do not invent missing candidate facts.
- Do not invent or correct email addresses.
- Do not set `send: true` before the MCP tool confirms success.
- Do not mark failed MCP sends as sent.
- Do not attach files unless the job asks for an attachment or the user explicitly instructs it.
```
