# Email Body Rules

Use this file to customize how `/send-job-emails` writes job application email bodies.

This file controls language, tone, structure, and wording preferences. Candidate facts such as role targets, experience, signature, and attachment paths should stay in `profile/job-profile.md` unless a section below explicitly asks for writing preferences.

## Language Preferences

- Preferred email language: English.
- If the job posting explicitly requests another language, match the requested language.
- If the job posting is in Portuguese and does not request English, Portuguese is acceptable.
- Do not claim fluency, native-level language ability, or advanced spoken language ability unless that fact is present in `profile/job-profile.md`.

## Tone

- Professional.
- Direct.
- Polite.
- Confident without exaggeration.
- Avoid overly informal wording.

## Default Structure

```text
Dear hiring team,

I would like to apply for the [role] position.

[Brief professional summary based only on profile/job-profile.md]

[Job-specific required content, if any]

Best regards,

[Candidate name]
[Custom signature, if available]
```

## Portuguese Fallback Structure

```text
Prezados,

Gostaria de me candidatar à vaga de [role].

[Resumo profissional breve baseado apenas em profile/job-profile.md]

[Conteúdo específico exigido pela vaga, se houver]

Atenciosamente,

[Nome da pessoa]
[Assinatura personalizada, se houver]
```

## Job-Specific Instructions

- Always follow explicit instructions from the job text before these defaults.
- If the job specifies exact body text, include it without contradiction.
- If the job asks for salary expectation, availability, location, language level, or another personal fact, use only facts present in `profile/job-profile.md`.
- If a required fact is missing, skip the job instead of inventing an answer.

## Attachment Wording

- Mention an attachment only when an attachment is actually sent.
- If a CV or resume is attached, a short line such as `I am attaching my resume for your review.` is acceptable.
- Do not mention attachments when `attachments` is empty.

## Avoid

- Do not invent personal details.
- Do not overstate experience.
- Do not include salary expectation unless explicitly present in `profile/job-profile.md`.
- Do not include availability unless explicitly present in `profile/job-profile.md`.
- Do not include phone, address, portfolio, LinkedIn, GitHub, or other links unless explicitly present in `profile/job-profile.md`.
