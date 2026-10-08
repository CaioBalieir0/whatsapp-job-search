import test from 'node:test';
import assert from 'node:assert/strict';

import { lintSkills } from './lint_skills.mjs';
import { runSecurityGuards } from './security_guards.mjs';

test('lintSkills accepts skills with headings and matching command references', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', '# Search WhatsApp Jobs\n\nCheck connectionState, request QR Code with instance/connect, then search jobs.'],
      ['filter-whatsapp-jobs', '# Filter WhatsApp Jobs\n\nUse when filtering jobs. Add hasEmail for every kept job when text contains an email-like address and validate with job.hasEmail !== "boolean".'],
    ]),
    opencodeConfig: {
      command: {
        search: { template: 'Use the search-whatsapp-jobs skill.' },
        filter: { template: 'Use the filter-whatsapp-jobs skill.' },
      },
    },
  });

  assert.deepEqual(result.errors, []);
});

test('lintSkills accepts skills with YAML frontmatter metadata before the title', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', '---\nname: search-whatsapp-jobs\ndescription: Use when searching jobs.\n---\n\n# Search WhatsApp Jobs\n\nCheck connectionState, request QR Code with instance/connect, then search jobs.\n'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, []);
});

test('lintSkills requires WhatsApp connection guidance in search skill', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', '# Search WhatsApp Jobs\n\nRun npm run search.'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, [
    '.claude/skills/search-whatsapp-jobs/SKILL.md must verify WhatsApp connection and QR Code setup before searching',
  ]);
});

test('lintSkills requires WhatsApp source onboarding guidance in setup skill', () => {
  const result = lintSkills({
    skills: new Map([
      ['setup-job-profile', '# Setup Job Profile\n\nGenerate profile files.'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, [
    '.claude/skills/setup-job-profile/SKILL.md must guide WhatsApp QR Code login and profile/whatsapp-sources.json JID setup',
  ]);
});

test('filter skill requires hasEmail in filtered job output', () => {
  const result = lintSkills({
    skills: new Map([
      ['filter-whatsapp-jobs', '# Filter WhatsApp Jobs\n\nKeep matching jobs and set send: false.'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, [
    '.claude/skills/filter-whatsapp-jobs/SKILL.md must add and validate hasEmail on filtered jobs',
  ]);
});

test('send skill requires email-eligible user selection before file-backed sending', () => {
  const result = lintSkills({
    skills: new Map([
      ['send-job-emails', '# Send Job Emails\n\nSend pending filtered jobs.'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, [
    '.claude/skills/send-job-emails/SKILL.md must require user selection from pending jobs with hasEmail: true before file-backed sending',
  ]);
});

test('lintSkills rejects missing titles and unknown command skill references', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', 'Use when searching jobs. Check connectionState, request QR Code with instance/connect, then search jobs.'],
    ]),
    opencodeConfig: {
      command: {
        broken: { template: 'Use the missing-skill skill.' },
      },
    },
  });

  assert.deepEqual(result.errors, [
    '.claude/skills/search-whatsapp-jobs/SKILL.md must contain a markdown title',
    'opencode.json command "broken" references missing skill "missing-skill"',
  ]);
});

test('runSecurityGuards accepts protected personal data rules and safe manifests', () => {
  const result = runSecurityGuards({
    rootGitignore: '.env\noutput/*.json\n!profile/documents/README.md\nmcp/scheduled-emails.json\nnode_modules\n.opencode/\n',
    packageJson: { scripts: { check: 'node --check index.mjs', test: 'node --test' } },
    mcpPackageJson: { scripts: { start: 'node email-server.mjs', test: 'node --test' } },
    opencodeConfig: {
      mcp: {
        email: {
          type: 'local',
          command: ['npm', '--prefix', 'mcp', 'start'],
          environment: { SMTP_PASS: '${SMTP_PASS}' },
        },
      },
    },
  });

  assert.deepEqual(result.errors, []);
});

test('runSecurityGuards rejects weakened ignores, lifecycle scripts, and unsafe MCP commands', () => {
  const result = runSecurityGuards({
    rootGitignore: 'node_modules\n',
    packageJson: { scripts: { postinstall: 'node install.js' } },
    mcpPackageJson: { scripts: { preinstall: 'node preinstall.js' } },
    opencodeConfig: {
      mcp: {
        email: {
          type: 'local',
          command: ['sh', '-c', 'npm --prefix mcp start'],
          environment: { SMTP_PASS: 'secret' },
        },
      },
    },
  });

  assert.deepEqual(result.errors, [
    '.gitignore must ignore .env',
    '.gitignore must ignore output/*.json',
    '.gitignore must keep profile/documents/README.md trackable',
    '.gitignore must ignore mcp/scheduled-emails.json',
    '.gitignore must ignore .opencode/',
    'package.json must not define lifecycle script "postinstall"',
    'mcp/package.json must not define lifecycle script "preinstall"',
    'opencode.json mcp.email command must be ["npm","--prefix","mcp","start"]',
    'opencode.json mcp.email environment SMTP_PASS must reference an environment variable placeholder',
  ]);
});
