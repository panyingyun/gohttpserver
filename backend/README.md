# Backend - Go HTTP Server

Go 语言后端服务，提供文件服务器的核心功能。

## 目录结构

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # 程序入口
├── internal/
│   ├── archive/
│   │   └── zip.go           # ZIP 压缩功能
│   ├── search/
│   │   └── search.go        # 文件搜索功能
│   ├── server/
│   │   ├── auth.go          # 认证和访问控制
│   │   ├── handlers.go      # HTTP 请求处理器
│   │   ├── http.go          # HTTP 服务器
│   │   └── middleware.go    # 中间件
│   └── webdav/
│       └── handler.go       # WebDAV 协议实现
├── go.mod
├── go.sum
└── README.md
```

## 功能特性

- 文件上传/下载
- 目录压缩为 ZIP
- 文件搜索
- 断点续传（HTTP Range 支持）
- 路径级别访问控制（ACL）
- HTTPS 支持
- WebDAV 协议支持
- RESTful API

## 开发

### 前置要求

- Go 1.23+

### 本地开发

```bash
cd backend

# 安装依赖
go mod download

# 运行服务
go run cmd/server/main.go --root /data --port 8080

# 构建
go build -o gohttpserver ./cmd/server
```

### 命令行参数

```bash
./gohttpserver --help

# 常用参数
--root, -r          # 根目录（默认: 当前目录）
--port, -p          # HTTP 端口（默认: 8080）
--https             # 启用 HTTPS
--https-port        # HTTPS 端口（默认: 8443）
--cert              # TLS 证书文件
--key               # TLS 私钥文件
--auth              # HTTP Basic Auth (格式: username:password)
--allow-paths       # 允许的路径（支持通配符，逗号分隔）
--deny-paths        # 拒绝的路径（支持通配符，逗号分隔）
--webdav            # 启用 WebDAV（默认: true）
--upload            # 启用文件上传（默认: false）
--delete            # 启用文件删除（默认: false）
--web-dir           # 前端文件目录（用于集成前端）
```

## API 端点

- `GET /api/list` - 列出文件
- `GET /api/files` - 列出文件（别名）
- `GET /api/search?q=keyword` - 搜索文件
- `GET /api/download/<path>` - 下载文件
- `GET /api/zip/<path>` - 下载目录为 ZIP
- `POST /api/upload` - 上传文件（需要 --upload）
- `DELETE /api/delete/<path>` - 删除文件（需要 --delete）
- `/webdav/` - WebDAV 端点（需要 --webdav）

## 测试

```bash
# 运行测试
go test ./...

# 运行特定包的测试
go test ./internal/server
```
