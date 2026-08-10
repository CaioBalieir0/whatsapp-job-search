import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildOutput,
  filterJobMessages,
  getHours,
  loadEnvFile,
  normalizeMessages,
  writeOutputFile,
} from './search-whatsapp-jobs.mjs';

test('getHours uses a positive numeric argument', () => {
  assert.equal(getHours(['12']), 12);
});

test('getHours defaults to 24 for invalid values', () => {
  assert.equal(getHours([]), 24);
  assert.equal(getHours(['0']), 24);
  assert.equal(getHours(['abc']), 24);
});

test('loadEnvFile parses simple dotenv values without overriding existing env', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'job-search-env-'));
  const envPath = path.join(dir, '.env');
  await writeOutputFile(envPath, 'EXISTING=from-file\nNEW_VALUE="quoted value"\n# comment\n');
  const env = { EXISTING: 'from-env' };

  await loadEnvFile(envPath, env);

  assert.equal(env.EXISTING, 'from-env');
  assert.equal(env.NEW_VALUE, 'quoted value');
  await rm(dir, { recursive: true, force: true });
});

test('normalizeMessages supports known Evolution API response shapes', () => {
  const records = [{ id: 1 }];

  assert.deepEqual(normalizeMessages(records), records);
  assert.deepEqual(normalizeMessages({ messages: { records } }), records);
  assert.deepEqual(normalizeMessages({ records }), records);
  assert.deepEqual(normalizeMessages({}), []);
});

test('filterJobMessages keeps only recent messages with email-like content', () => {
  const now = 10_000;
  const messages = [
    {
      pushName: 'Recent Sender',
      messageTimestamp: 9_990,
      message: { conversation: 'Send CV to hiring@example.com' },
    },
    {
      pushName: 'Extended Sender',
      messageTimestamp: 9_980,
      message: { extendedTextMessage: { text: 'Apply at jobs@example.com' } },
    },
    {
      pushName: 'Old Sender',
      messageTimestamp: 6_000,
      message: { conversation: 'old@example.com' },
    },
    {
      pushName: 'No Email Sender',
      messageTimestamp: 9_995,
      message: { conversation: 'No contact address here' },
    },
  ];

  assert.deepEqual(filterJobMessages(messages, 1, now), [
    { sender: 'Recent Sender', text: 'Send CV to hiring@example.com', timestamp: 9_990 },
    { sender: 'Extended Sender', text: 'Apply at jobs@example.com', timestamp: 9_980 },
  ]);
});

test('buildOutput preserves the expected jobs-email schema', () => {
  const output = buildOutput([{ sender: 'A', text: 'a@example.com', timestamp: 1 }], 24, new Date('2026-08-09T00:00:00.000Z'));

  assert.deepEqual(output, {
    lastRun: '2026-08-09T00:00:00.000Z',
    hoursConsulted: 24,
    total: 1,
    jobs: [{ sender: 'A', text: 'a@example.com', timestamp: 1 }],
  });
});

test('writeOutputFile creates parent directories and writes content', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'job-search-output-'));
  const outputPath = path.join(dir, 'nested', 'jobs-email.json');

  await writeOutputFile(outputPath, JSON.stringify({ ok: true }));
  assert.equal(await readFile(outputPath, 'utf8'), '{"ok":true}');

  await rm(dir, { recursive: true, force: true });
});
