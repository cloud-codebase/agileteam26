FROM nginx:alpine

# Copy custom Nginx configuration listening on port 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend assets into Nginx html webroot
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY game.js* /usr/share/nginx/html/
COPY app.js* /usr/share/nginx/html/

# Expose port 8080 as required by Cloud Run single-container architecture
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
