FROM node:20-alpine

WORKDIR /app

# Copy package descriptors first for Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source
COPY . .

# Cloud Run / Single-container port
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
