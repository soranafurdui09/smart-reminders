FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY worker ./worker

ENV NODE_ENV=production

CMD ["node", "worker/index.js"]
