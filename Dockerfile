# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    HUSKY=0 npm ci

FROM dependencies AS builder
ARG BLOG_PROFILE=public
ARG SITE_URL=https://blog.jwjeong127.com
ENV BLOG_PROFILE=$BLOG_PROFILE SITE_URL=$SITE_URL STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3020 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=10001:10001 /app/.next/standalone ./
COPY --from=builder --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=builder --chown=10001:10001 /app/public ./public
USER 10001:10001
EXPOSE 3020
CMD ["node", "server.js"]

FROM dependencies AS collector
ENV NODE_ENV=production
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 lib/archive-format.mjs lib/archive-storage.mjs ./lib/
COPY --chown=10001:10001 scripts/archive-substack.mjs scripts/archive-backup.mjs ./scripts/
USER 10001:10001
ENTRYPOINT ["node", "scripts/archive-substack.mjs"]
