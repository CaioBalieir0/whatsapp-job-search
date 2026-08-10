import test from 'node:test';
import assert from 'node:assert/strict';

import { lintSkills } from './lint_skills.mjs';
import { runSecurityGuards } from './security_guards.mjs';

test('lintSkills accepts skills with headings and matching command references', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', '# Search WhatsApp Jobs\n\nUse when searching jobs.'],
      ['filter-whatsapp-jobs', '# Filter WhatsApp Jobs\n\nUse when filtering jobs.'],
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
      ['search-whatsapp-jobs', '---\nname: search-whatsapp-jobs\ndescription: Use when searching jobs.\n---\n\n# Search WhatsApp Jobs\n'],
    ]),
    opencodeConfig: { command: {} },
  });

  assert.deepEqual(result.errors, []);
});

test('lintSkills rejects missing titles and unknown command skill references', () => {
  const result = lintSkills({
    skills: new Map([
      ['search-whatsapp-jobs', 'Use when searching jobs.'],
    ]),
    opencodeConfig: {
      command: {
        broken: { template: 'Use the missing-skill skill.' },
      },
    },
  });

  assert.deepEqual(result.errors, [
    '.opencode/skills/search-whatsapp-jobs/SKILL.md must contain a markdown title',
    '.opencode/opencode.json command "broken" references missing skill "missing-skill"',
  ]);
});

test('runSecurityGuards accepts protected personal data rules and safe manifests', () => {
  const result = runSecurityGuards({
    rootGitignore: '.env\noutput/*.json\n!profile/documents/README.md\nmcp/scheduled-emails.json\nnode_modules\n',
    opencodeGitignore: 'node_modules\npackage.json\npackage-lock.json\nbun.lock\n.gitignore\n',
    packageJson: { scripts: { check: 'node --check index.mjs', test: 'node --test' } },
    mcpPackageJson: { scripts: { start: 'node email-server.mjs', test: 'node --test' } },
    opencodeConfig: {
      mcp: {
        email: {
          type: 'local',
          command: ['npm', '--prefix', 'mcp', 'start'],
          env: { SMTP_PASS: '${SMTP_PASS}' },
        },
      },
    },
  });

  assert.deepEqual(result.errors, []);
});

test('runSecurityGuards rejects weakened ignores, lifecycle scripts, and unsafe MCP commands', () => {
  const result = runSecurityGuards({
    rootGitignore: 'node_modules\n',
    opencodeGitignore: 'node_modules\n',
    packageJson: { scripts: { postinstall: 'node install.js' } },
    mcpPackageJson: { scripts: { preinstall: 'node preinstall.js' } },
    opencodeConfig: {
      mcp: {
        email: {
          type: 'local',
          command: ['sh', '-c', 'npm --prefix mcp start'],
          env: { SMTP_PASS: 'secret' },
        },
      },
    },
  });

  assert.deepEqual(result.errors, [
    '.gitignore must ignore .env',
    '.gitignore must ignore output/*.json',
    '.gitignore must keep profile/documents/README.md trackable',
    '.gitignore must ignore mcp/scheduled-emails.json',
    '.opencode/.gitignore must ignore package.json',
    '.opencode/.gitignore must ignore package-lock.json',
    'package.json must not define lifecycle script "postinstall"',
    'mcp/package.json must not define lifecycle script "preinstall"',
    '.opencode/opencode.json mcp.email command must be ["npm","--prefix","mcp","start"]',
    '.opencode/opencode.json mcp.email env SMTP_PASS must reference an environment variable placeholder',
  ]);
});
