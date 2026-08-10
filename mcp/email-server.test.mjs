import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import {
  buildMailOptions,
  createSmtpConfig,
  enqueueScheduledEmail,
  normalizeAttachments,
  readScheduledEmails,
  sendEmail,
  writeScheduledEmails,
} from "./email-server.mjs"
import { processDueEmails, startEmailWorker } from "./email-worker.mjs"
import { createHttpServer } from "./http-server.mjs"

async function withTempQueue(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "email-queue-"))
  const queueFile = path.join(directory, "scheduled-emails.json")

  try {
    await run(queueFile)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function withHttpServer(server, run) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

  try {
    const { port } = server.address()
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

test("createSmtpConfig requires all SMTP variables", () => {
  assert.throws(
    () => createSmtpConfig({ SMTP_HOST: "smtp.gmail.com" }),
    /Missing required SMTP environment variables: SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM/,
  )
})

test("createSmtpConfig builds Gmail-compatible SMTP config", () => {
  const config = createSmtpConfig({
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "587",
    SMTP_USER: "sender@gmail.com",
    SMTP_PASS: "app-password",
    SMTP_FROM: "sender@gmail.com",
  })

  assert.deepEqual(config, {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "sender@gmail.com",
      pass: "app-password",
    },
    from: "sender@gmail.com",
  })
})

test("normalizeAttachments accepts local path strings", () => {
  assert.deepEqual(normalizeAttachments(["/tmp/report.pdf", "relative.txt"]), [
    { path: "/tmp/report.pdf" },
    { path: "relative.txt" },
  ])
})

test("normalizeAttachments rejects non-string attachments", () => {
  assert.throws(() => normalizeAttachments([42]), /attachments must be an array of file path strings/)
})

test("buildMailOptions ignores schedule and builds plain text email", () => {
  const mail = buildMailOptions(
    {
      to: ["recipient@example.com"],
      subject: "Hello",
      body: "Plain body",
      attachments: ["/tmp/report.pdf"],
      schedule: "tomorrow",
    },
    "sender@gmail.com",
  )

  assert.deepEqual(mail, {
    from: "sender@gmail.com",
    to: ["recipient@example.com"],
    subject: "Hello",
    text: "Plain body",
    attachments: [{ path: "/tmp/report.pdf" }],
  })
})

test("sendEmail sends through injected transport", async () => {
  const sent = []
  const result = await sendEmail(
    {
      to: "recipient@example.com",
      subject: "Subject",
      body: "Body",
      attachments: [],
      schedule: null,
    },
    {
      env: {
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587",
        SMTP_USER: "sender@gmail.com",
        SMTP_PASS: "app-password",
        SMTP_FROM: "sender@gmail.com",
      },
      createTransport: (config) => ({
        async sendMail(mail) {
          sent.push({ config, mail })
          return { messageId: "message-123", accepted: ["recipient@example.com"], rejected: [] }
        },
      }),
    },
  )

  assert.equal(result.messageId, "message-123")
  assert.deepEqual(result.accepted, ["recipient@example.com"])
  assert.deepEqual(result.rejected, [])
  assert.equal(sent.length, 1)
  assert.equal(sent[0].mail.text, "Body")
})

test("enqueueScheduledEmail persists an email job without the schedule field", async () => {
  await withTempQueue(async (queueFile) => {
    const result = await enqueueScheduledEmail(
      {
        to: "recipient@example.com",
        subject: "Scheduled subject",
        body: "Scheduled body",
        attachments: ["/tmp/report.pdf"],
        schedule: "2026-08-09T21:00:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )

    const jobs = await readScheduledEmails(queueFile)

    assert.equal(result.scheduled, true)
    assert.equal(result.sendAt, "2026-08-09T21:00:00.000Z")
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].id, result.jobId)
    assert.equal(jobs[0].sendAt, "2026-08-09T21:00:00.000Z")
    assert.deepEqual(jobs[0].email, {
      to: "recipient@example.com",
      subject: "Scheduled subject",
      body: "Scheduled body",
      attachments: ["/tmp/report.pdf"],
    })
  })
})

test("enqueueScheduledEmail assigns increasing numeric ids from 1 to 100", async () => {
  await withTempQueue(async (queueFile) => {
    const first = await enqueueScheduledEmail(
      {
        to: "first@example.com",
        subject: "First subject",
        body: "First body",
        attachments: [],
        schedule: "2026-08-09T21:00:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )
    const second = await enqueueScheduledEmail(
      {
        to: "second@example.com",
        subject: "Second subject",
        body: "Second body",
        attachments: [],
        schedule: "2026-08-09T22:00:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )
    const jobs = await readScheduledEmails(queueFile)

    assert.equal(first.jobId, 1)
    assert.equal(second.jobId, 2)
    assert.deepEqual(jobs.map((job) => job.id), [1, 2])
  })
})

test("enqueueScheduledEmail rejects new jobs when the numeric id range is full", async () => {
  await withTempQueue(async (queueFile) => {
    await writeScheduledEmails(
      Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        createdAt: "2026-08-09T20:00:00.000Z",
        sendAt: "2026-08-09T21:00:00.000Z",
        email: {
          to: `recipient-${index + 1}@example.com`,
          subject: "Subject",
          body: "Body",
          attachments: [],
        },
      })),
      queueFile,
    )

    await assert.rejects(
      () =>
        enqueueScheduledEmail(
          {
            to: "overflow@example.com",
            subject: "Overflow subject",
            body: "Overflow body",
            attachments: [],
            schedule: "2026-08-09T22:00:00.000Z",
          },
          { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
        ),
      /scheduled email queue supports ids from 1 to 100/,
    )
  })
})

test("sendEmail schedules future emails instead of sending immediately", async () => {
  await withTempQueue(async (queueFile) => {
    let sent = false
    const result = await sendEmail(
      {
        to: "recipient@example.com",
        subject: "Future subject",
        body: "Future body",
        attachments: [],
        schedule: "2026-08-09T21:00:00.000Z",
      },
      {
        queueFile,
        now: new Date("2026-08-09T20:00:00.000Z"),
        env: {
          SMTP_HOST: "smtp.gmail.com",
          SMTP_PORT: "587",
          SMTP_USER: "sender@gmail.com",
          SMTP_PASS: "app-password",
          SMTP_FROM: "sender@gmail.com",
        },
        createTransport: () => ({
          async sendMail() {
            sent = true
          },
        }),
      },
    )

    const jobs = await readScheduledEmails(queueFile)

    assert.equal(sent, false)
    assert.equal(result.scheduled, true)
    assert.equal(result.sendAt, "2026-08-09T21:00:00.000Z")
    assert.equal(jobs.length, 1)
  })
})

test("processDueEmails sends expired jobs and removes each successful email from JSON", async () => {
  await withTempQueue(async (queueFile) => {
    await enqueueScheduledEmail(
      {
        to: "due@example.com",
        subject: "Due subject",
        body: "Due body",
        attachments: [],
        schedule: "2026-08-09T20:59:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )
    await enqueueScheduledEmail(
      {
        to: "future@example.com",
        subject: "Future subject",
        body: "Future body",
        attachments: [],
        schedule: "2026-08-09T22:00:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )

    const sent = []
    const result = await processDueEmails({
      queueFile,
      now: new Date("2026-08-09T21:00:00.000Z"),
      send: async (email) => {
        sent.push(email)
        return { messageId: "message-123", accepted: [email.to], rejected: [] }
      },
    })
    const jobs = await readScheduledEmails(queueFile)

    assert.deepEqual(result, { processed: 1, sent: 1, failed: 0 })
    assert.deepEqual(sent.map((email) => email.to), ["due@example.com"])
    assert.deepEqual(jobs.map((job) => job.email.to), ["future@example.com"])
  })
})

test("processDueEmails keeps failed jobs in JSON for a later poll", async () => {
  await withTempQueue(async (queueFile) => {
    await enqueueScheduledEmail(
      {
        to: "retry@example.com",
        subject: "Retry subject",
        body: "Retry body",
        attachments: [],
        schedule: "2026-08-09T20:59:00.000Z",
      },
      { queueFile, now: new Date("2026-08-09T20:00:00.000Z") },
    )

    const result = await processDueEmails({
      queueFile,
      now: new Date("2026-08-09T21:00:00.000Z"),
      send: async () => {
        throw new Error("SMTP unavailable")
      },
    })
    const rawQueue = JSON.parse(await readFile(queueFile, "utf8"))

    assert.deepEqual(result, { processed: 1, sent: 0, failed: 1 })
    assert.equal(rawQueue.length, 1)
    assert.equal(rawQueue[0].email.to, "retry@example.com")
  })
})

test("startEmailWorker polls repeatedly with the configured interval", async () => {
  let calls = 0
  let worker = null

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker?.stop()
      reject(new Error("worker did not poll twice"))
    }, 200)

    worker = startEmailWorker({
      pollIntervalMs: 10,
      processDue: async () => {
        calls += 1

        if (calls === 2) {
          clearTimeout(timeout)
          worker.stop()
          resolve()
        }

        return { processed: 0, sent: 0, failed: 0 }
      },
    })
  })

  assert.equal(calls, 2)
})

test("HTTP MCP rejects missing bearer token", async () => {
  const server = createHttpServer({ token: "secret", handleMcpRequest: async () => assert.fail("should not reach MCP") })

  await withHttpServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST" })

    assert.equal(response.status, 401)
  })
})

test("HTTP MCP rejects invalid bearer token", async () => {
  const server = createHttpServer({ token: "secret", handleMcpRequest: async () => assert.fail("should not reach MCP") })

  await withHttpServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { authorization: "Bearer wrong" },
    })

    assert.equal(response.status, 403)
  })
})

test("HTTP MCP forwards valid bearer token requests to the MCP transport", async () => {
  let reachedMcp = false
  const server = createHttpServer({
    token: "secret",
    handleMcpRequest: async (_request, response) => {
      reachedMcp = true
      response.writeHead(202, { "content-type": "application/json" })
      response.end(JSON.stringify({ ok: true }))
    },
  })

  await withHttpServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    })
    const json = await response.json()

    assert.equal(response.status, 202)
    assert.equal(json.ok, true)
    assert.equal(reachedMcp, true)
  })
})

test("HTTP MCP returns health without exposing SMTP data", async () => {
  const server = createHttpServer({ token: "secret", handleMcpRequest: async () => assert.fail("should not reach MCP") })

  await withHttpServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, { method: "GET" })
    const json = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(json, { ok: true, service: "email-mcp" })
  })
})
