import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function lintSkills({ skills, opencodeConfig }) {
  const errors = [];

  for (const [skillName, content] of skills) {
    if (!hasMarkdownTitle(content)) {
      errors.push(`.opencode/skills/${skillName}/SKILL.md must contain a markdown title`);
    }

    if (content.startsWith('---\n') && !/^description:\s*\S/m.test(content)) {
      errors.push(`.opencode/skills/${skillName}/SKILL.md frontmatter must include description`);
    }
  }

  for (const [commandName, command] of Object.entries(opencodeConfig.command ?? {})) {
    const template = String(command.template ?? '');
    const matches = template.matchAll(/Use the ([a-z0-9-]+) skill\b/g);

    for (const match of matches) {
      const skillName = match[1];
      if (!skills.has(skillName)) {
        errors.push(`.opencode/opencode.json command "${commandName}" references missing skill "${skillName}"`);
      }
    }
  }

  return { errors };
}

function hasMarkdownTitle(content) {
  return /^#\s+\S/m.test(content);
}

function loadRepositoryInputs(rootDir) {
  const skillsDir = join(rootDir, '.opencode', 'skills');
  const skills = new Map();

  for (const dirent of readdirSync(skillsDir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      skills.set(dirent.name, readFileSync(join(skillsDir, dirent.name, 'SKILL.md'), 'utf8'));
    }
  }

  return {
    skills,
    opencodeConfig: JSON.parse(readFileSync(join(rootDir, '.opencode', 'opencode.json'), 'utf8')),
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
