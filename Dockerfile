# ==============================================================================
# Production-ready Dockerfile for Movie Database & Review Platform
# Uses Alpine Linux with Node.js runtime and Nginx reverse proxy on port 8080
# ==============================================================================

FROM node:20-alpine

# Install Nginx and wget for healthchecks
RUN apk add --no-cache nginx wget ca-certificates

# Create working directory for Node.js backend
WORKDIR /app

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend application source code
COPY server.js ./
COPY server/ ./server/

# Prepare directories for Nginx static assets and runtime files
RUN mkdir -p /usr/share/nginx/html /run/nginx /var/log/nginx

# Copy static frontend assets (HTML, CSS, JS) to Nginx web root
COPY public/ /usr/share/nginx/html/

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy container startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port 8080 as specified in acceptance criteria
EXPOSE 8080

# Environment configuration
ENV NODE_ENV=production \
    PORT=3000

# Container healthcheck against Nginx listening on port 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

# Start Node backend and Nginx reverse proxy
CMD ["/app/start.sh"]
