# Stage 1: Build the application
FROM node:16.5.0-alpine AS builder
WORKDIR /usr/src
COPY . .
RUN pnpm install && pnpm build

# Stage 2: Set up Nginx to serve the built application
FROM nginx:latest
COPY --from=builder /usr/src/dist/lib.js /usr/share/nginx/html/

# Remove default Nginx configurations
RUN rm /etc/nginx/nginx.conf && rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configurations
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Optional: List directory contents for debugging
RUN ls -al /etc/nginx
RUN ls -al /usr/share/nginx/html