FROM node:22-alpine

WORKDIR /mcp

ARG MCP_HTTP_PORT=3333

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY email-server.mjs email-worker.mjs http-server.mjs ./

EXPOSE ${MCP_HTTP_PORT}

CMD ["npm", "run", "start:http"]
