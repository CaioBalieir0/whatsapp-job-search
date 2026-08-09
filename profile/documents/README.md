# Profile Documents

Put optional source material for `/setup` in this folder.

The folder is free-form. You can place files directly here without creating subfolders, and you can remove them after setup if you do not want to keep personal documents in the workspace.

## What To Add

Useful materials include:

- CVs or resumes in PDF, Markdown, text, or source format.
- LinkedIn profile exports or copied profile text.
- Portfolio notes and project descriptions.
- Career preferences, target roles, and deal-breakers.
- Notes about technologies, seniority, work mode, location, languages, or contract types.
- Past job postings or application notes that help calibrate what a good match looks like.
- Any professional context you want `/setup` to consider when generating the profile.

## How `/setup` Uses This Folder

When you run `/setup`, the setup skill can read these documents and turn them into normalized local files:

- `profile/job-profile.md`
- `profile/email-body-rules.md`

Those generated files become the operational source of truth for the rest of the workflow.

Filtering does not read this folder. Email sending does not read this folder. If you update a CV or add new notes here, run `/setup` again so the profile files can be refreshed.

## If You Do Not Want To Add Files

You can paste your CV, resume, notes, or professional context directly into the `/setup` conversation instead. Use whichever path is easier for the information you have available.

## Privacy

Files in this folder may contain personal information, contact details, salary expectations, employment history, or private application material.

You can keep these files versioned in your own private fork or private repository if that helps you maintain your job-search workspace. We recommend avoiding public repositories for CVs, resumes, PDFs, LinkedIn exports, or private notes unless they have been intentionally sanitized.
