import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function lintSkills({ skills, opencodeConfig }) {
  const errors = [];

  for (const [skillName, content] of skills) {
    if (!hasMarkdownTitle(content)) {
      errors.push(`.claude/skills/${skillName}/SKILL.md must contain a markdown title`);
    }

    if (content.startsWith('---\n') && !/^description:\s*\S/m.test(content)) {
      errors.push(`.claude/skills/${skillName}/SKILL.md frontmatter must include description`);
    }

    if (skillName === 'search-whatsapp-jobs' && !hasWhatsAppConnectionGuidance(content)) {
      errors.push('.claude/skills/search-whatsapp-jobs/SKILL.md must verify WhatsApp connection and QR Code setup before searching');
    }

    if (skillName === 'setup-job-profile' && !hasWhatsAppSourceSetupGuidance(content)) {
      errors.push('.claude/skills/setup-job-profile/SKILL.md must guide WhatsApp QR Code login and profile/whatsapp-sources.json JID setup');
    }

    if (skillName === 'filter-whatsapp-jobs' && !hasFilteredJobEmailEligibilityGuidance(content)) {
      errors.push('.claude/skills/filter-whatsapp-jobs/SKILL.md must add and validate hasEmail on filtered jobs');
    }

    if (skillName === 'send-job-emails' && !hasEmailEligibleSelectionGuidance(content)) {
      errors.push('.claude/skills/send-job-emails/SKILL.md must require user selection from pending jobs with hasEmail: true before file-backed sending');
    }
  }

  for (const [commandName, command] of Object.entries(opencodeConfig.command ?? {})) {
    const template = String(command.template ?? '');
    const matches = template.matchAll(/Use the ([a-z0-9-]+) skill\b/g);

    for (const match of matches) {
      const skillName = match[1];
      if (!skills.has(skillName)) {
        errors.push(`opencode.json command "${commandName}" references missing skill "${skillName}"`);
      }
    }
  }

  return { errors };
}

function hasMarkdownTitle(content) {
  return /^#\s+\S/m.test(content);
}

function hasWhatsAppConnectionGuidance(content) {
  return /connectionState/.test(content) && /QR Code/.test(content) && /instance\/connect/.test(content);
}

function hasWhatsAppSourceSetupGuidance(content) {
  return /QR Code/.test(content) && /profile\/whatsapp-sources\.json/.test(content) && /\bJID\b|\bjid\b/.test(content);
}

function hasFilteredJobEmailEligibilityGuidance(content) {
  return /hasEmail/.test(content) && /email-like address/.test(content) && /job\.hasEmail !== "boolean"/.test(content);
}

function hasEmailEligibleSelectionGuidance(content) {
  return /hasEmail: true/.test(content) && /ask the user to choose/.test(content) && /todas/.test(content);
}

function loadRepositoryInputs(rootDir) {
  const skillsDir = join(rootDir, '.claude', 'skills');
  const skills = new Map();

  for (const dirent of readdirSync(skillsDir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      skills.set(dirent.name, readFileSync(join(skillsDir, dirent.name, 'SKILL.md'), 'utf8'));
    }
  }

  return {
    skills,
    opencodeConfig: JSON.parse(readFileSync(join(rootDir, 'opencode.json'), 'utf8')),
  };
}

function main() {
  const rootDir = process.cwd();
  const result = lintSkills(loadRepositoryInputs(rootDir));

  for (const error of result.errors) {
    console.error(error);
  }

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
