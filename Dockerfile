# Multi-stage build for Go HTTP Server with React frontend

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts ./
COPY frontend/tailwind.config.js frontend/postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy source files
COPY frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src

# Build frontend
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.23-alpine AS backend-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git

# Set Go proxy for better download reliability
ENV GOPROXY=https://goproxy.cn,https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies with retry
RUN go mod download || (sleep 5 && go mod download) || (sleep 10 && go mod download)

# Copy source code
COPY backend/cmd ./cmd
COPY backend/internal ./internal

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o gohttpserver ./cmd/server

# Stage 3: Final image
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /build/gohttpserver .

# Copy frontend files from frontend builder
COPY --from=frontend-builder /build/dist ./web

# Create directory for file storage
RUN mkdir -p /data && touch /data/README.md

# Expose port
EXPOSE 8080 8443

# Set default environment variables
ENV ROOT_DIR=/data
ENV PORT=8080
# AUTH can be set via environment variable (format: username:password)
# Example: docker run -e AUTH=admin:password123 ...
# ENV AUTH=

# Use ENTRYPOINT with shell form to allow parameter merging
# This ensures --web-dir is always included even when custom args are provided
ENTRYPOINT ["./gohttpserver", "--root", "/data", "--port", "8080", "--web-dir", "/app/web"]

# Default command arguments (can be appended via docker run)
# Note: --upload and --delete are disabled by default for security
# To enable upload/delete, add --upload --delete after the image name in docker run
# Example: docker run ... gohttpserver:latest --upload --delete
CMD []
