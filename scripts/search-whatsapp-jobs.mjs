import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOURS = 24;
const DEFAULT_OUTPUT_FILE = 'output/jobs-email.json';
const REQUIRED_ENV = ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE', 'WHATSAPP_GROUP_JID'];

export function getHours(args) {
  const value = Number(args[0]);
  return value > 0 ? value : DEFAULT_HOURS;
}

export async function loadEnvFile(envPath = '.env', target = process.env) {
  let content;
  try {
    content = await readFile(envPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return target;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && target[key] === undefined) {
      target[key] = value;
    }
  }

  return target;
}

export function validateConfig(env) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    apiUrl: env.EVOLUTION_API_URL.replace(/\/+$/, ''),
    apiKey: env.EVOLUTION_API_KEY,
    instance: env.EVOLUTION_INSTANCE,
    groupJid: env.WHATSAPP_GROUP_JID,
    outputFile: env.JOBS_OUTPUT_FILE || DEFAULT_OUTPUT_FILE,
  };
}

export function normalizeMessages(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.messages?.records)) return raw.messages.records;
  if (Array.isArray(raw?.records)) return raw.records;
  return [];
}

export function filterJobMessages(messages, hours, nowSeconds = Math.floor(Date.now() / 1000)) {
  const startWindow = nowSeconds - hours * 60 * 60;
  const results = [];

  for (const message of messages) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    if (!text) continue;

    const timestamp = Number(message.messageTimestamp);
    if (!Number.isFinite(timestamp) || timestamp < startWindow) continue;
    if (!text.includes('@')) continue;

    results.push({
      sender: message.pushName || '',
      text,
      timestamp,
    });
  }

  return results;
}

export function buildOutput(jobs, hours, now = new Date()) {
  return {
    lastRun: now.toISOString(),
    hoursConsulted: hours,
    total: jobs.length,
    jobs,
  };
}

export async function writeOutputFile(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

export async function fetchMessages(config, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.apiUrl}/chat/findMessages/${config.instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
    body: JSON.stringify({
      where: {
        key: {
          remoteJid: config.groupJid,
        },
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Evolution API request failed with status ${response.status}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

export async function run(args = process.argv.slice(2), env = process.env) {
  await loadEnvFile('.env', env);

  const hours = getHours(args);
  const config = validateConfig(env);
  const raw = await fetchMessages(config);
  const messages = normalizeMessages(raw);
  const jobs = filterJobMessages(messages, hours);
  const output = buildOutput(jobs, hours);

  await writeOutputFile(config.outputFile, `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  run()
    .then((output) => {
      console.log(JSON.stringify({
        lastRun: output.lastRun,
        hoursConsulted: output.hoursConsulted,
        total: output.total,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
