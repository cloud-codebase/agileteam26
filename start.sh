#!/bin/sh
set -e

# Function to handle shutdown signals
cleanup() {
    echo "Received termination signal. Shutting down..."
    if [ -n "$NODE_PID" ]; then
        kill -TERM "$NODE_PID" 2>/dev/null || true
    fi
    nginx -s stop 2>/dev/null || true
    exit 0
}

trap cleanup TERM INT HUP

echo "Starting Node.js backend server on internal port ${PORT:-3000}..."
node /app/server.js &
NODE_PID=$!

# Ensure nginx run and log directories exist
mkdir -p /run/nginx /var/log/nginx

# Test nginx configuration
echo "Validating Nginx configuration..."
nginx -t

echo "Starting Nginx reverse proxy on port 8080..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for either process to exit
wait -n $NODE_PID $NGINX_PID
EXIT_CODE=$?

cleanup
exit $EXIT_CODE
