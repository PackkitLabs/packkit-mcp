# Container image for hosts that run the MCP server from a build (e.g. Glama).
# Note: Glama generates its own Dockerfile from its admin panel — this file is for
# other hosts and local use. See RELEASING.md for Glama's known-good build config.
FROM node:26-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
ENTRYPOINT ["node", "server.js"]
