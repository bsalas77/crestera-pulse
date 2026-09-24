FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_CRESTERA_URL=
ENV VITE_CRESTERA_URL=$VITE_CRESTERA_URL
RUN npm run build
# The browser may only talk to this UI's own origin and the configured API origin (CSP connect-src).
# A malformed VITE_API_URL fails the build here instead of shipping a broken policy.
RUN node -e "const fs=require('fs');const o=new URL(process.env.VITE_API_URL).origin;fs.writeFileSync('default.conf',fs.readFileSync('nginx.conf.template','utf8').replace('__API_ORIGIN__',o))"

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3   CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
