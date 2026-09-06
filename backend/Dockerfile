# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --legacy-peer-deps || npm install --only=production --legacy-peer-deps
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Non-root user for security best practice
USER node

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node dist/app.js"]
