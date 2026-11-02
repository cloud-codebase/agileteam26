FROM nginx:alpine

# Configure nginx to listen on port 8080 as required by Cloud Run
RUN sed -i 's/listen\s*80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# Copy static frontend assets into nginx document root
COPY . /usr/share/nginx/html/

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
