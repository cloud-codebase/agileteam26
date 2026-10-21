FROM nginx:alpine

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration serving on port 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web assets
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Expose port 8080 as specified
EXPOSE 8080

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
