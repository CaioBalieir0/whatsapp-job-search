#!/usr/bin/env node

import { createServer as createNodeServer } from "node:http"
import { pathToFileURL } from "node:url"

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"

import { createServer as createMcpServer } from "./email-server.mjs"

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function jsonResponse(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" })
  response.end(JSON.stringify(body))
}

function readToken(options = {}) {
  const token = options.token ?? process.env.MCP_AUTH_TOKEN

  if (!token) {
    throw new Error("MCP_AUTH_TOKEN is required for HTTP MCP mode")
  }

  return token
}

export async function handleStreamableMcpRequest(request, response) {
  const server = createMcpServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  try {
    await server.connect(transport)
    await transport.handleRequest(request, response)
  } finally {
    response.on("close", () => {
      transport.close().catch((error) => console.error(errorMessage(error)))
      server.close().catch((error) => console.error(errorMessage(error)))
    })
  }
}

export function createHttpServer(options = {}) {
  const token = readToken(options)
  const handleMcpRequest = options.handleMcpRequest ?? handleStreamableMcpRequest

  return createNodeServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)

    if (request.method === "GET" && url.pathname === "/health") {
      jsonResponse(response, 200, { ok: true, service: "email-mcp" })
      return
    }

    if (url.pathname !== "/mcp") {
      jsonResponse(response, 404, { ok: false, error: "Not found" })
      return
    }

    const authorization = request.headers.authorization

    if (!authorization) {
      jsonResponse(response, 401, { ok: false, error: "Missing bearer token" })
      return
    }

    if (authorization !== `Bearer ${token}`) {
      jsonResponse(response, 403, { ok: false, error: "Invalid bearer token" })
      return
    }

    try {
      await handleMcpRequest(request, response)
    } catch (error) {
      if (!response.headersSent) {
        jsonResponse(response, 500, { ok: false, error: errorMessage(error) })
      } else {
        response.end()
      }
    }
  })
}

export async function main() {
  const host = process.env.MCP_HTTP_HOST ?? "0.0.0.0"
  const port = Number.parseInt(process.env.MCP_HTTP_PORT ?? "3333", 10)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("MCP_HTTP_PORT must be a positive integer")
  }

  const server = createHttpServer()
  server.listen(port, host, () => {
    console.error(JSON.stringify({ service: "email-mcp", mode: "streamable-http", path: "/mcp", host, port }))
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(errorMessage(error))
    process.exit(1)
  })
}
