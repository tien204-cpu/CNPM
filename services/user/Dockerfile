FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --no-audit --no-fund --silent
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:18-bullseye-slim AS runtime
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN apt-get update && apt-get install -y netcat-openbsd --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=noninteractive
# Do not run `prisma db push` automatically on container start to avoid unexpected
# destructive schema changes. We only generate the client and start the app here.
# Schema changes should be applied manually (or via CI) with a controlled command
# such as `npx prisma db push --accept-data-loss` (only after explicit approval)
# or `npm run prisma:migrate` when using migrations.
CMD ["sh", "-lc", "until nc -z db 5432; do echo 'waiting for db'; sleep 1; done; npm run prisma:generate && npx prisma db push --accept-data-loss && npm run start"]
