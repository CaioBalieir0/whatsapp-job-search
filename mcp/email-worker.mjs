#!/usr/bin/env node

import { pathToFileURL } from "node:url"

import { DEFAULT_QUEUE_FILE, getScheduledEmailQueue, sendEmail, updateScheduledEmails } from "./email-server.mjs"

export const POLL_INTERVAL_MS = 10 * 60 * 1000

function isDue(job, now) {
  const timestamp = Date.parse(job.sendAt)
  return Number.isFinite(timestamp) && timestamp <= now.getTime()
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export async function processDueEmails(options = {}) {
  const queueFile = await getScheduledEmailQueue(options)
  const now = options.now ?? new Date()
  const send = options.send ?? ((email) => sendEmail(email))

  return updateScheduledEmails(queueFile, async (jobs) => {
    const remaining = []
    let processed = 0
    let sent = 0
    let failed = 0

    for (const job of jobs) {
      if (!isDue(job, now)) {
        remaining.push(job)
        continue
      }

      processed += 1

      try {
        await send(job.email)
        sent += 1
      } catch (error) {
        failed += 1
        remaining.push({
          ...job,
          attempts: (job.attempts ?? 0) + 1,
          lastError: errorMessage(error),
          lastAttemptAt: now.toISOString(),
        })
      }
    }

    return {
      jobs: remaining,
      result: { processed, sent, failed },
      write: processed > 0,
    }
  })
}

export function startEmailWorker(options = {}) {
  const queueFile = options.queue ?? options.queueFile ?? DEFAULT_QUEUE_FILE
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS
  const processDue = options.processDue ?? processDueEmails
  let stopped = false
  let timer = null

  async function poll() {
    try {
      const result = await processDue({ queueFile })

      if (result.processed > 0) {
        console.error(JSON.stringify({ queueFile, ...result }))
      }
    } catch (error) {
      console.error(errorMessage(error))
    } finally {
      if (!stopped) {
        timer = setTimeout(poll, pollIntervalMs)
      }
    }
  }

  timer = setTimeout(poll, 0)

  return {
    stop() {
      stopped = true

      if (timer) {
        clearTimeout(timer)
      }
    },
  }
}

export async function main() {
  const worker = startEmailWorker()

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      worker.stop()
      process.exit(0)
    })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(errorMessage(error))
    process.exit(1)
  })
}
