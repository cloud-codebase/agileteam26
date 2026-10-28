FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend web assets
COPY . /usr/share/nginx/html

# Expose port 8080 as required by Cloud Run single-container specification
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
