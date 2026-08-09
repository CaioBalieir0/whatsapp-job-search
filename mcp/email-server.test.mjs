import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMailOptions,
  createSmtpConfig,
  normalizeAttachments,
  sendEmail,
} from "./email-server.mjs"

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
