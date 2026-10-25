FROM nginx:alpine

# Copy custom Nginx configuration listening on port 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web assets to Nginx html directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Expose port 8080
EXPOSE 8080

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
