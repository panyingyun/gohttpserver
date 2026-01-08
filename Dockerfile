# Multi-stage build for Go HTTP Server with React frontend

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files
COPY web/package.json web/package-lock.json* ./
COPY web/tsconfig.json web/tsconfig.node.json web/vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy source files
COPY web/index.html ./
COPY web/public ./public
COPY web/src ./src

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
COPY go.mod go.sum ./

# Download dependencies with retry
RUN go mod download || (sleep 5 && go mod download) || (sleep 10 && go mod download)

# Copy source code
COPY cmd ./cmd
COPY internal ./internal

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o server ./cmd/server

# Stage 3: Final image
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /build/server .

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
CMD ["./server", "--root", "/data", "--port", "8080", "--web-dir", "./web"]
