# Go HTTP Server

一个功能完整的 Go 语言静态文件服务器，使用 React+TypeScript 前端，支持文件上传下载、目录压缩、搜索、断点续传、访问控制和 HTTPS/WebDAV 支持。

## 功能特性

- ✅ **文件上传/下载**: 支持多文件上传和拖拽上传
- ✅ **目录压缩**: 将目录打包为 ZIP 文件下载
- ✅ **文件搜索**: 基于文件名的模糊搜索，实时搜索
- ✅ **断点续传**: 支持 HTTP Range 请求，实现断点续传和并发下载
- ✅ **路径访问控制**: 支持路径级别的允许/拒绝规则（支持通配符）
- ✅ **HTTPS 支持**: 支持 TLS/SSL 加密传输
- ✅ **WebDAV 支持**: 完整的 WebDAV 协议实现
- ✅ **curl 友好**: RESTful API 设计，方便命令行工具调用
- ✅ **现代化前端**: React + TypeScript，响应式设计，拖拽上传
- ✅ **文件管理**: 前端可查看、上传、下载、搜索和删除文件

## 技术栈

### 后端
- Go 1.23+
- Cobra (CLI 框架)
- 标准库 net/http
- 标准库 archive/zip

### 前端
- React 18
- TypeScript 5+
- Vite (构建工具)

## 安装

### 一键安装[强烈推荐]
```bash
docker stop gohttpserver
docker rm gohttpserver
docker run -itd --restart=always  -v /opt/gohttpserver:/data -p 8080:8080 --name  gohttpserver harbor.michaelapp.com/gohttpserver/gohttpserver:v1.2
```

### 本地使用Docker构建安装 [推荐]

```bash
git clone <repository-url>
cd gohttpserver
# 构建镜像
docker stop gohttpserver
docker rm gohttpserver
docker build -t gohttpserver:latest .

# 运行容器
docker run -itd  --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data gohttpserver:latest
```

### 从源码构建 [不推荐]

```bash
git clone <repository-url>
cd gohttpserver

# 构建后端
cd backend
go mod download
go build -o gohttpserver ./cmd/server

# 构建前端
cd ../frontend
npm install
npm run build

# 运行（需要将前端构建产物复制到后端可访问的位置）
cd ../backend
./gohttpserver --root /data --port 8080 --web-dir ../frontend/dist
```

## 使用方法

### 基本用法

```bash
# 启动服务器（默认端口 8080，当前目录）
./gohttpserver

# 指定根目录和端口
./gohttpserver --root /path/to/files --port 9000

# 启用前端（需要先构建前端）
./gohttpserver --root ./data --port 8080 --web-dir ./frontend/dist

# 启用 HTTPS
./gohttpserver --https --cert cert.pem --key key.pem

# 启用 HTTP Basic 认证
./gohttpserver --auth "username:password"

# 启用 WebDAV（默认启用）
./gohttpserver --webdav
```

### 命令行参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--root` | `-r` | 服务根目录 | `.` (当前目录) |
| `--port` | `-p` | HTTP 端口 | `8080` |
| `--https-port` | | HTTPS 端口 | `8443` |
| `--https` | | 启用 HTTPS | `false` |
| `--cert` | | TLS 证书文件路径 | |
| `--key` | | TLS 私钥文件路径 | |
| `--auth` | | HTTP Basic 认证 (格式: username:password) | |
| `--allow-paths` | | 允许访问的路径列表（逗号分隔，支持通配符） | |
| `--deny-paths` | | 拒绝访问的路径列表（逗号分隔，支持通配符） | |
| `--webdav` | | 启用 WebDAV 支持 | `true` |
| `--upload` | | 启用文件上传功能 | `false` |
| `--delete` | | 启用文件删除功能 | `false` |
| `--web-dir` | | 前端文件目录 | |

### 访问控制示例

```bash
# 只允许访问 /public 和 /shared 目录
./gohttpserver --allow-paths "/public,/shared"

# 拒绝访问 /private 目录
./gohttpserver --deny-paths "/private"

# 组合使用：允许 /public，拒绝 /public/secret
./gohttpserver --allow-paths "/public" --deny-paths "/public/secret"
```

**注意**: 访问控制优先级：`deny` > `allow` > 默认策略（允许）

## API 接口

### 文件列表

```bash
# 获取文件列表
curl http://localhost:8080/api/list?path=/

# 带认证
curl -u username:password http://localhost:8080/api/list?path=/subdir
```

### 文件下载

```bash
# 下载文件
curl -O http://localhost:8080/api/download/path/to/file.txt

# 断点续传（支持 Range 请求）
curl -C - -O http://localhost:8080/api/download/large-file.zip
```

### 目录压缩下载

```bash
# 下载目录为 ZIP
curl -O http://localhost:8080/api/zip/path/to/directory
```

### 文件上传

**注意**: 需要启动时使用 `--upload` 标志启用上传功能。

```bash
# 单文件上传
curl -X POST -F "file=@/path/to/file.txt" -F "path=/" http://localhost:8080/api/upload

# 多文件上传
curl -X POST -F "files=@file1.txt" -F "files=@file2.txt" -F "path=/uploads" http://localhost:8080/api/upload
```

### 文件搜索

```bash
# 搜索文件
curl "http://localhost:8080/api/search?q=keyword"

# 限制搜索结果数量
curl "http://localhost:8080/api/search?q=keyword&max=50"
```

### 删除文件/目录

**注意**: 需要启动时使用 `--delete` 标志启用删除功能。

```bash
# 删除文件
curl -X DELETE http://localhost:8080/api/delete/path/to/file.txt
```

## Web 界面

访问 `http://localhost:8080/` 即可使用 Web 界面：

- 📁 浏览文件和目录（表格视图）
- 🔍 实时搜索文件
- 📤 拖拽上传文件
- ⬇️ 下载文件和目录（ZIP）
- 🗑️ 删除文件/目录
- 🧭 面包屑导航

## WebDAV 使用

启用 WebDAV 后，可以使用任何 WebDAV 客户端访问：

```bash
# 使用 curl
curl -X PROPFIND http://localhost:8080/

# 使用 cadaver（WebDAV 客户端）
cadaver http://localhost:8080/
```

### WebDAV 支持的方法

- `GET/HEAD`: 读取文件
- `PUT`: 上传文件
- `DELETE`: 删除文件/目录
- `MKCOL`: 创建目录
- `PROPFIND`: 列出目录内容
- `MOVE/COPY`: 移动/复制

## 开发

### 项目结构

```
gohttpserver/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── backend/              # Go 后端
│   ├── cmd/
│   ├── internal/
│   ├── go.mod
│   └── README.md
└── frontend/             # React 前端
    ├── src/
    ├── public/
    ├── package.json
    └── README.md
```

### 前端开发

```bash
cd frontend
npm install
npm run dev  # 开发模式，支持热重载
```

前端开发服务器运行在 `http://localhost:3000`，会自动代理 API 请求到后端。

### 后端开发

```bash
cd backend
go run ./cmd/server --root ../data --port 8080 --web-dir ../frontend/dist
```

详细开发说明请参考：
- [backend/README.md](backend/README.md) - 后端开发文档
- [frontend/README.md](frontend/README.md) - 前端开发文档

## Docker 使用

### 构建镜像

```bash
docker build -t gohttpserver:latest .
```

### 运行容器

```bash
# 基本运行
docker run -d \
  --name gohttpserver \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  gohttpserver:latest

# 使用 docker-compose
docker-compose up -d
```

## 安全建议

1. **生产环境使用 HTTPS**: 始终使用 `--https` 选项并配置有效的 TLS 证书
2. **启用认证**: 使用 `--auth` 选项设置用户名和密码
3. **路径访问控制**: 使用 `--allow-paths` 和 `--deny-paths` 限制访问范围
4. **防火墙配置**: 仅开放必要的端口
5. **定期更新**: 保持 Go 版本和依赖库的更新

## 许可证

本项目采用 GPL-3.0 许可证。详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！
