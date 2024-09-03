FROM node:20.15.0-alpine AS builder
WORKDIR /usr/src
COPY . .
RUN yarn install && yarn build

FROM nginx:latest
COPY --from=builder /usr/src/packages/javascript-sdk/dist/web/lib.js /usr/share/nginx/html
RUN rm /etc/nginx/nginx.conf && rm /etc/nginx/conf.d/default.conf
COPY packages/javascript-sdk/docker/nginx.conf /etc/nginx/nginx.conf
COPY packages/javascript-sdk/docker/default.conf /etc/nginx/conf.d/default.conf