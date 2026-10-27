FROM nginx:alpine

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration listening on port 8080
COPY nginx.conf /etc/nginx/nginx.conf

# Copy application static files to Nginx web root
COPY . /usr/share/nginx/html/

# Expose port 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
