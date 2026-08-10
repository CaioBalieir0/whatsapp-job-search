import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIFECYCLE_SCRIPTS = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepack',
  'postpack',
  'prepare',
  'prepublish',
  'prepublishOnly',
]);

export function runSecurityGuards({
  rootGitignore,
  packageJson,
  mcpPackageJson,
  opencodeConfig,
}) {
  const errors = [];

  requireGitignoreLine(errors, '.gitignore', rootGitignore, '.env', 'must ignore .env');
  requireGitignoreLine(errors, '.gitignore', rootGitignore, 'output/*.json', 'must ignore output/*.json');
  requireGitignoreLine(
    errors,
    '.gitignore',
    rootGitignore,
    '!profile/documents/README.md',
    'must keep profile/documents/README.md trackable',
  );
  requireGitignoreLine(
    errors,
    '.gitignore',
    rootGitignore,
    'mcp/scheduled-emails.json',
    'must ignore mcp/scheduled-emails.json',
  );
  requireGitignoreLine(
    errors,
    '.gitignore',
    rootGitignore,
    '.opencode/',
    'must ignore .opencode/',
  );

  rejectLifecycleScripts(errors, 'package.json', packageJson);
  rejectLifecycleScripts(errors, 'mcp/package.json', mcpPackageJson);

  const emailMcp = opencodeConfig.mcp?.email;
  const expectedCommand = ['npm', '--prefix', 'mcp', 'start'];
  if (JSON.stringify(emailMcp?.command) !== JSON.stringify(expectedCommand)) {
    errors.push('opencode.json mcp.email command must be ["npm","--prefix","mcp","start"]');
  }

  for (const [name, value] of Object.entries(emailMcp?.environment ?? {})) {
    if (!/^\$\{[A-Z0-9_]+\}$/.test(String(value))) {
      errors.push(`opencode.json mcp.email environment ${name} must reference an environment variable placeholder`);
    }
  }

  return { errors };
}

function requireGitignoreLine(errors, fileName, content, requiredLine, message) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  if (!lines.includes(requiredLine)) {
    errors.push(`${fileName} ${message}`);
  }
}

function rejectLifecycleScripts(errors, fileName, manifest) {
  for (const scriptName of Object.keys(manifest.scripts ?? {})) {
    if (LIFECYCLE_SCRIPTS.has(scriptName)) {
      errors.push(`${fileName} must not define lifecycle script "${scriptName}"`);
    }
  }
}

function loadRepositoryInputs(rootDir) {
  return {
    rootGitignore: readFileSync(join(rootDir, '.gitignore'), 'utf8'),
    packageJson: JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')),
    mcpPackageJson: JSON.parse(readFileSync(join(rootDir, 'mcp', 'package.json'), 'utf8')),
    opencodeConfig: JSON.parse(readFileSync(join(rootDir, 'opencode.json'), 'utf8')),
  };
}

function main() {
  const result = runSecurityGuards(loadRepositoryInputs(process.cwd()));

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
