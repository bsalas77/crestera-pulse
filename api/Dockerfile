FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:25-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# Copied files keep the build host's permissions; on a hardened server
# (umask 027) package.json would be unreadable to the non-root runtime user and
# Node refuses to start ("Cannot read package config").
RUN chmod 0644 package.json package-lock.json && npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3   CMD wget -qO- http://127.0.0.1:8000/health || exit 1

CMD ["node", "dist/main.js"]
