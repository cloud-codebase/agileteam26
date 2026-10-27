FROM nginx:alpine

# Copy static game files
COPY . /usr/share/nginx/html

# Configure Nginx to listen on port 8080
RUN printf 'server {\n    listen 8080;\n    server_name localhost;\n    location / {\n        root /usr/share/nginx/html;\n        index index.html index.htm;\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
