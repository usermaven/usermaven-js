FROM node:16.5.0-alpine AS builder
WORKDIR /usr/src
COPY . .
RUN pnpm install && pnpm build

FROM nginx:latest
COPY --from=builder /usr/src/dist/lib.js /usr/share/nginx/html
RUN rm /etc/nginx/nginx.conf && rm /etc/nginx/conf.d/default.conf
RUN ls -al
COPY packages/javascript-sdk/docker/nginx.conf /etc/nginx/nginx.conf
COPY packages/javascript-sdk/docker/default.conf /etc/nginx/conf.d/default.conf
