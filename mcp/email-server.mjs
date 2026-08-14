#!/usr/bin/env node

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath, pathToFileURL } from "node:url"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import nodemailer from "nodemailer"
import { createClient } from "redis"
import { z } from "zod"

const emailInputSchema = {
  to: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(z.string().min(1)).default([]),
  schedule: z.unknown().optional(),
}

const requiredEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const DEFAULT_QUEUE_FILE = process.env.EMAIL_QUEUE_FILE ?? path.join(moduleDirectory, "scheduled-emails.json")
export const DEFAULT_REDIS_KEY = process.env.EMAIL_REDIS_KEY ?? "email-mcp:scheduled-emails"
const MAX_SCHEDULED_EMAIL_ID = 100
const LOCK_RETRY_MS = 50
const LOCK_TIMEOUT_MS = 5000
let defaultRedisClient = null

export function createSmtpConfig(env = process.env) {
  const missing = requiredEnv.filter((name) => !env[name])

  if (missing.length > 0) {
    throw new Error(`Missing required SMTP environment variables: ${missing.join(", ")}`)
  }

  const port = Number.parseInt(env.SMTP_PORT, 10)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer")
  }

  return {
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.SMTP_FROM,
  }
}

export function normalizeAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.some((attachment) => typeof attachment !== "string")) {
    throw new Error("attachments must be an array of file path strings")
  }

  return attachments.map((path) => ({ path }))
}

export function buildMailOptions(input, from) {
  return {
    from,
    to: input.to,
    subject: input.subject,
    text: input.body,
    attachments: normalizeAttachments(input.attachments ?? []),
  }
}

function isRedisQueue(queue) {
  return Boolean(queue && typeof queue === "object" && queue.redisClient)
}

export async function getScheduledEmailQueue(options = {}) {
  if (options.queue) {
    return options.queue
  }

  const redisUrl = options.redisUrl ?? process.env.EMAIL_REDIS_URL ?? process.env.REDIS_URL

  if (!redisUrl) {
    return options.queueFile ?? DEFAULT_QUEUE_FILE
  }

  if (!defaultRedisClient) {
    defaultRedisClient = createClient({ url: redisUrl })
    await defaultRedisClient.connect()
  }

  return {
    redisClient: defaultRedisClient,
    redisKey: options.redisKey ?? DEFAULT_REDIS_KEY,
  }
}

function parseRedisJobs(values) {
  return values.map((value) => JSON.parse(value))
}

async function readScheduledEmailsFromRedis(queue) {
  const values = await queue.redisClient.zRange(queue.redisKey ?? DEFAULT_REDIS_KEY, 0, -1)

  return parseRedisJobs(values)
}

async function writeScheduledEmailsToRedis(jobs, queue) {
  const redisKey = queue.redisKey ?? DEFAULT_REDIS_KEY
  await queue.redisClient.del(redisKey)

  if (jobs.length === 0) {
    return
  }

  await queue.redisClient.zAdd(
    redisKey,
    jobs.map((job) => ({
      score: Date.parse(job.sendAt),
      value: JSON.stringify(job),
    })),
  )
}

export async function readScheduledEmails(queueFile = DEFAULT_QUEUE_FILE) {
  if (isRedisQueue(queueFile)) {
    return readScheduledEmailsFromRedis(queueFile)
  }

  try {
    const contents = await readFile(queueFile, "utf8")

    if (contents.trim() === "") {
      return []
    }

    const jobs = JSON.parse(contents)

    if (!Array.isArray(jobs)) {
      throw new Error("scheduled email queue must be a JSON array")
    }

    return jobs
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return []
    }

    throw error
  }
}

export async function writeScheduledEmails(jobs, queueFile = DEFAULT_QUEUE_FILE) {
  if (isRedisQueue(queueFile)) {
    await writeScheduledEmailsToRedis(jobs, queueFile)
    return
  }

  await mkdir(path.dirname(queueFile), { recursive: true })

  const temporaryFile = `${queueFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(jobs, null, 2)}\n`)
  await rename(temporaryFile, queueFile)
}

export async function updateScheduledEmails(queueFile, update) {
  if (isRedisQueue(queueFile)) {
    const jobs = await readScheduledEmails(queueFile)
    const { jobs: nextJobs, result, write = true } = await update(jobs)

    if (write) {
      await writeScheduledEmails(nextJobs, queueFile)
    }

    return result
  }

  const lockDirectory = `${queueFile}.lock`
  const startedAt = Date.now()
  let locked = false

  while (!locked) {
    try {
      await mkdir(lockDirectory, { recursive: false })
      locked = true
    } catch (error) {
      if (!error || error.code !== "EEXIST") {
        throw error
      }

      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for scheduled email queue lock: ${lockDirectory}`)
      }

      await delay(LOCK_RETRY_MS)
    }
  }

  try {
    const jobs = await readScheduledEmails(queueFile)
    const { jobs: nextJobs, result, write = true } = await update(jobs)

    if (write) {
      await writeScheduledEmails(nextJobs, queueFile)
    }

    return result
  } finally {
    await rm(lockDirectory, { recursive: true, force: true })
  }
}

export function parseSchedule(schedule, now = new Date()) {
  let value = schedule

  if (schedule && typeof schedule === "object" && !Array.isArray(schedule)) {
    value = schedule.sendAt
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("schedule must be an ISO date string or an object with sendAt")
  }

  const sendAt = new Date(value)

  if (Number.isNaN(sendAt.getTime())) {
    throw new Error("schedule must be a valid date/time")
  }

  if (sendAt <= now) {
    throw new Error("schedule must be in the future")
  }

  return sendAt.toISOString()
}

export function nextScheduledEmailId(jobs) {
  const highestId = jobs.reduce((highest, job) => {
    return Number.isInteger(job.id) && job.id > highest ? job.id : highest
  }, 0)

  if (highestId >= MAX_SCHEDULED_EMAIL_ID) {
    throw new Error("scheduled email queue supports ids from 1 to 100")
  }

  return highestId + 1
}

export async function enqueueScheduledEmail(input, options = {}) {
  const queueFile = await getScheduledEmailQueue(options)
  const now = options.now ?? new Date()
  const sendAt = parseSchedule(input.schedule, now)

  return updateScheduledEmails(queueFile, async (jobs) => {
    const job = {
      id: nextScheduledEmailId(jobs),
      createdAt: now.toISOString(),
      sendAt,
      email: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        attachments: input.attachments ?? [],
      },
    }

    jobs.push(job)
    jobs.sort((left, right) => Date.parse(left.sendAt) - Date.parse(right.sendAt))

    return {
      jobs,
      result: {
        scheduled: true,
        jobId: job.id,
        sendAt,
      },
    }
  })
}

export async function sendEmail(input, options = {}) {
  if (input.schedule !== undefined && input.schedule !== null) {
    return enqueueScheduledEmail(input, options)
  }

  const env = options.env ?? process.env
  const createTransport = options.createTransport ?? nodemailer.createTransport
  const config = createSmtpConfig(env)
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })
  const info = await transporter.sendMail(buildMailOptions(input, config.from))

  return {
    messageId: info.messageId ?? null,
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
  }
}

export function createServer() {
  const server = new McpServer({
    name: "email-mcp",
    version: "0.1.0",
  })

  server.tool("send_email", emailInputSchema, async (input) => {
    try {
      const result = await sendEmail(input)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, ...result }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Failed to send email",
          },
        ],
      }
    }
  })

  return server
}

export async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
