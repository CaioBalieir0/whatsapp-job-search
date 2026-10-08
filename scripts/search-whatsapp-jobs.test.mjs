import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildOutput,
  fetchMessagesForSources,
  filterJobMessages,
  getHours,
  loadSources,
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

test('loadSources reads configured WhatsApp sources from JSON', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'job-search-sources-'));
  const sourcesPath = path.join(dir, 'whatsapp-sources.json');
  await writeOutputFile(sourcesPath, JSON.stringify({
    sources: [
      { name: 'Tech Jobs Group', jid: '123456789@g.us' },
      { name: 'Recruiter John', jid: '5511999999999@s.whatsapp.net' },
      { name: 'Invalid Source', jid: '' },
    ],
  }));

  const sources = await loadSources({ sourcesFile: sourcesPath });

  assert.deepEqual(sources, [
    { name: 'Tech Jobs Group', jid: '123456789@g.us' },
    { name: 'Recruiter John', jid: '5511999999999@s.whatsapp.net' },
  ]);
  await rm(dir, { recursive: true, force: true });
});

test('loadSources requires the source JSON file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'job-search-sources-'));
  const sourcesPath = path.join(dir, 'missing-sources.json');

  await assert.rejects(
    loadSources({ sourcesFile: sourcesPath }),
    /WhatsApp sources file not found/
  );
  await rm(dir, { recursive: true, force: true });
});

test('documented WhatsApp sources example is loadable', async () => {
  const sources = await loadSources({ sourcesFile: path.resolve('profile/whatsapp-sources.example.json') });

  assert.deepEqual(sources, [
    { name: 'Tech Jobs Group', jid: 'replace-with-group-jid@g.us' },
    { name: 'Recruiter John', jid: 'replace-with-contact-jid@s.whatsapp.net' },
  ]);
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

test('filterJobMessages adds source metadata when source is provided', () => {
  const now = 10_000;
  const source = { name: 'Tech Jobs Group', jid: '123456789@g.us' };
  const messages = [
    {
      pushName: 'Recent Sender',
      messageTimestamp: 9_990,
      message: { conversation: 'Send CV to hiring@example.com' },
    },
  ];

  assert.deepEqual(filterJobMessages(messages, 1, now, source), [
    { sender: 'Recent Sender', text: 'Send CV to hiring@example.com', timestamp: 9_990, source },
  ]);
});

test('fetchMessagesForSources fetches messages once per configured source', async () => {
  const requests = [];
  const config = {
    apiUrl: 'http://localhost:8080',
    apiKey: 'secret',
    instance: 'my-instance',
  };
  const sources = [
    { name: 'Group A', jid: 'a@g.us' },
    { name: 'Group B', jid: 'b@g.us' },
  ];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ records: [{ id: requests.length }] }),
    };
  };

  const results = await fetchMessagesForSources(config, sources, fetchImpl);

  assert.deepEqual(results, [
    { source: sources[0], raw: { records: [{ id: 1 }] } },
    { source: sources[1], raw: { records: [{ id: 2 }] } },
  ]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'http://localhost:8080/chat/findMessages/my-instance');
  assert.equal(requests[0].options.headers.apikey, 'secret');
  assert.deepEqual(JSON.parse(requests[0].options.body), { where: { key: { remoteJid: 'a@g.us' } } });
  assert.deepEqual(JSON.parse(requests[1].options.body), { where: { key: { remoteJid: 'b@g.us' } } });
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
