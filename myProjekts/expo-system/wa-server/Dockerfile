# The WhatsApp server, on the VPS beside n8n (deploy.sh). Node 24 runs the TypeScript directly.
# The image mirrors the repo: /app/wa-server, and beside it the engine and the approved texts the planner uses,
# with the dependencies of all three in /app/node_modules.
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY engine ./engine
COPY consultant-rounds ./consultant-rounds
COPY wa-server ./wa-server
ENV NODE_ENV=production
WORKDIR /app/wa-server
CMD ["node", "--max-old-space-size=1200", "server.ts"]
