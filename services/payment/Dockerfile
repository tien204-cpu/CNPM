FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --no-audit --no-fund --silent
COPY . .
RUN npm run build

FROM node:18-bullseye-slim AS runtime
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/public ./dist/public
RUN apt-get update && apt-get install -y netcat-openbsd --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=noninteractive
CMD ["npm", "run", "start"]
