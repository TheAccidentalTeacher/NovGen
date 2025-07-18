# Multi-stage build for Node.js backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && \
    cd backend && npm ci

# Copy source code
COPY . .

# Build the backend
RUN cd backend && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files for production install
COPY --from=builder /app/backend/package*.json ./backend/

# Install only production dependencies
RUN cd backend && npm install --omit=dev

# Copy built application
COPY --from=builder /app/backend/dist ./backend/dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start", "--prefix", "backend"]
