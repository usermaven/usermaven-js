FROM node:16.5.0-alpine AS builder
WORKDIR /usr/src
COPY . .
RUN yarn install && yarn build

FROM nginx:latest
COPY --from=builder /usr/src/dist/web/lib.js /usr/share/nginx/html
RUN rm /etc/nginx/nginx.conf && rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf