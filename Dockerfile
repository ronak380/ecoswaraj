# Production Dockerfile for Next.js
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for build caching)
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose server port
EXPOSE 3000
ENV PORT 3000

# Start server
CMD ["npm", "start"]
