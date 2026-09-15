# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM base AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS prod
RUN npm run build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["sh", "-c", "next start -H 0.0.0.0 -p ${PORT:-3000}"]
