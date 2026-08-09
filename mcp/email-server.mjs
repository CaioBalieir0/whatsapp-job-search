#!/usr/bin/env node

import { pathToFileURL } from "node:url"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import nodemailer from "nodemailer"
import { z } from "zod"

const emailInputSchema = {
  to: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(z.string().min(1)).default([]),
  schedule: z.unknown().optional(),
}

const requiredEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]

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

export async function sendEmail(input, options = {}) {
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
