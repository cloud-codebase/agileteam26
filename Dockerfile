FROM nginx:alpine

# Copy custom Nginx configuration listening on port 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all static web assets into standard Nginx html directory
COPY . /usr/share/nginx/html

# Expose Cloud Run default port
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
