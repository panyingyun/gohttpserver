# Multi-stage build for Go HTTP Server with React frontend

# Stage 1: Build React frontend
FROM node:24-alpine AS frontend-builder

WORKDIR /build

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts ./
COPY frontend/tailwind.config.js frontend/postcss.config.js ./

# Install dependencies
RUN npm install -g npm@11.7.0
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

# Initialize go module if needed and build the application
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o gohttpserver ./cmd/server

# Stage 3: Final image
FROM alpine:latest

# Install ca-certificates for HTTPS and wget for healthcheck
RUN apk --no-cache add ca-certificates tzdata wget

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /build/gohttpserver .

# Copy frontend files from frontend builder
COPY --from=frontend-builder /build/dist ./web

# Create directory for file storage
RUN mkdir -p /data

# Expose port
EXPOSE 8080 8443

# Set default environment variables
ENV ROOT_DIR=/data
ENV PORT=8080

# Run the server
CMD ["./gohttpserver", "--root", "/data", "--port", "8080", "--web-dir", "./web","--upload", "--delete"]
