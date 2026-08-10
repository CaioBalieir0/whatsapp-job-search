FROM node:22-alpine

WORKDIR /mcp

ENV NODE_ENV=production
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_HTTP_PORT=3333
ENV EMAIL_QUEUE_FILE=/mcp/data/scheduled-emails.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY email-server.mjs email-worker.mjs http-server.mjs ./

EXPOSE 3333

CMD ["npm", "run", "start:http"]
