FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# /api is served by this image's nginx (see nginx.conf.template). An absolute URL
# points the UI at an API elsewhere instead.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_CRESTERA_URL=
ENV VITE_CRESTERA_URL=$VITE_CRESTERA_URL
RUN npm run build
# The browser may only talk to this UI's own origin, plus an external API's origin if one is
# configured (CSP connect-src). A malformed absolute URL fails the build here.
RUN node -e "const fs=require('fs');const u=process.env.VITE_API_URL;const o=/^https?:/i.test(u)?' '+new URL(u).origin:'';fs.writeFileSync('security-headers.conf',fs.readFileSync('security-headers.conf.template','utf8').replace(' __API_ORIGIN__',o))"

FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY --from=build --chmod=0644 /app/nginx.conf.template /etc/nginx/conf.d/default.conf
COPY --from=build --chmod=0644 /app/security-headers.conf /etc/nginx/conf.d/security-headers.inc
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
