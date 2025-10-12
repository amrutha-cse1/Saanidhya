# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY murf-backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend code
COPY murf-backend/ ./

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
