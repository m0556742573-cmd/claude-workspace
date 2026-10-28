# The WhatsApp server, on the VPS beside n8n (deploy.sh). Node 24 runs the TypeScript directly.
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.ts limits.ts ./
ENV NODE_ENV=production
CMD ["node", "--max-old-space-size=1200", "server.ts"]
