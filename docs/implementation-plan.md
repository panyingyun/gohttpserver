# Go+TypeScript+React 静态文件服务器实现计划

## 保存离线字体
保存字体、公开链接的CSS, JS等到本地，使用本地链接

## 项目架构

```
gohttpserver/
├── cmd/
│   └── server/
│       └── main.go              # 主入口，Cobra CLI
├── internal/
│   ├── server/
│   │   ├── http.go              # HTTP服务器主逻辑
│   │   ├── handlers.go          # HTTP处理器（上传、下载、搜索等）
│   │   ├── auth.go              # HTTP Basic 认证和路径权限控制
│   │   └── middleware.go        # 中间件（CORS、日志等）
│   ├── webdav/
│   │   └── handler.go           # WebDAV 协议实现
│   ├── archive/
│   │   └── zip.go               # 目录压缩为 ZIP
│   └── search/
│       └── search.go            # 文件搜索功能
├── web/
│   ├── public/
│   │   └── index.html           # HTML 入口
│   ├── src/
│   │   ├── main.tsx             # React 入口
│   │   ├── App.tsx              # 主应用组件
│   │   ├── components/
│   │   │   ├── FileList.tsx     # 文件列表组件
│   │   │   ├── FileUpload.tsx   # 文件上传组件（拖拽）
│   │   │   ├── SearchBar.tsx    # 搜索组件
│   │   │   └── Breadcrumb.tsx   # 面包屑导航
│   │   ├── services/
│   │   │   └── api.ts           # API 调用封装
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript 类型定义
│   │   └── utils/
│   │       └── format.ts        # 工具函数
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts           # Vite 配置
├── go.mod
├── go.sum
├── Dockerfile
└── README.md
```

## 核心功能实现

### 1. Go 后端实现

#### 1.1 CLI 框架 (cmd/server/main.go)

- 使用 Cobra 构建命令行接口
- 参数：
  - `--root`: 服务根目录（默认当前目录）
  - `--port`: HTTP 端口（默认 8080）
  - `--https-port`: HTTPS 端口（默认 8443）
  - `--https`: 启用 HTTPS
  - `--cert`: TLS 证书路径
  - `--key`: TLS 私钥路径
  - `--auth`: HTTP Basic 认证（格式: username:password）
  - `--allow-paths`: 允许访问的路径（支持通配符）
  - `--deny-paths`: 拒绝访问的路径
  - `--webdav`: 启用 WebDAV（默认 true）

#### 1.2 HTTP 处理器 (internal/server/handlers.go)

- `GET /api/list?path=/`: 列出目录内容（JSON）
- `GET /api/search?q=keyword`: 搜索文件
- `POST /api/upload`: 上传文件（multipart/form-data，支持多文件）
- `GET /api/download/*`: 下载文件（支持 Range 请求，断点续传）
- `GET /api/zip/*`: 下载目录为 ZIP
- `DELETE /api/delete/*`: 删除文件/目录
- 所有 API 返回 JSON 格式

#### 1.3 认证和权限控制 (internal/server/auth.go)

- HTTP Basic 认证实现
- 路径级别访问控制（ACL）
- 支持通配符路径匹配
- 优先级：deny > allow > 默认策略

#### 1.4 WebDAV 支持 (internal/webdav/handler.go)

- 实现核心 WebDAV 方法：
  - PROPFIND: 目录列表
  - GET/PUT: 文件读写
  - DELETE: 删除
  - MKCOL: 创建目录
  - MOVE/COPY: 移动/复制
- 集成认证和权限控制

#### 1.5 目录压缩 (internal/archive/zip.go)

- 使用标准库 `archive/zip`
- 流式压缩，支持大目录
- 路径安全验证

#### 1.6 文件搜索 (internal/search/search.go)

- 基于文件名的模糊搜索
- 并发搜索，支持结果限制
- 返回文件路径、大小、修改时间等信息

#### 1.7 断点续传 (internal/server/handlers.go)

- 实现 HTTP Range 请求支持
- 使用 `http.ServeContent` 处理 Range 头
- 支持多范围请求（206 Partial Content）

### 2. React+TypeScript 前端实现

#### 2.1 项目设置

- 使用 Vite 作为构建工具
- React 18 + TypeScript
- 无 UI 框架依赖（纯 CSS 或 Tailwind CSS）

#### 2.2 核心组件

**FileList.tsx** - 文件列表

- 表格/卡片形式展示文件和目录
- 显示文件大小、修改时间
- 支持点击目录进入
- 支持文件下载和目录 ZIP 下载
- 支持删除操作

**FileUpload.tsx** - 文件上传

- 拖拽上传支持
- 多文件上传
- 上传进度显示
- 错误处理

**SearchBar.tsx** - 搜索功能

- 实时搜索（防抖）
- 搜索结果高亮
- 搜索历史（可选）

**Breadcrumb.tsx** - 面包屑导航

- 显示当前路径
- 支持快速跳转

#### 2.3 API 服务 (web/src/services/api.ts)

- 统一的 API 调用封装
- 错误处理
- 请求拦截器（添加认证头）
- TypeScript 类型定义

#### 2.4 类型定义 (web/src/types/index.ts)

- FileInfo: 文件信息
- ListResponse: 列表响应
- SearchResponse: 搜索响应
- UploadResponse: 上传响应

### 3. 功能特性

#### ✅ 1. 下载目录为 ZIP

- 后端：`GET /api/zip/*` 端点
- 前端：目录操作按钮，点击下载 ZIP

#### ✅ 2. 上传文件/目录（支持拖拽）

- 后端：`POST /api/upload` 支持 multipart
- 前端：拖拽区域组件，支持多文件

#### ✅ 3. 搜索文件

- 后端：`GET /api/search?q=keyword`
- 前端：搜索输入框，实时搜索，结果展示

#### ✅ 4. 并发下载、断点续传

- 后端：HTTP Range 请求支持
- 前端：使用原生 fetch，浏览器自动处理断点续传

#### ✅ 5. 路径级别访问控制

- 后端：ACL 中间件，支持 allow/deny 规则
- 前端：显示访问被拒绝的错误信息

#### ✅ 6. 支持 HTTPS

- 后端：TLS 配置，支持证书和私钥
- CLI：`--https` 参数

#### ✅ 7. 支持 WebDAV

- 后端：完整的 WebDAV 协议实现
- 可通过 WebDAV 客户端访问

#### ✅ 8. 方便 curl 调用

- RESTful API 设计
- JSON 响应格式
- 支持 Basic Auth

#### ✅ 9. 前端可查看、上传和下载文件

- 文件列表展示
- 拖拽上传
- 文件下载链接

#### ✅ 10. 前端可搜索文件

- 搜索输入框
- 实时搜索
- 搜索结果展示

## 技术选型

### 后端

- Go 1.23+
- Cobra (CLI)
- 标准库 net/http
- 标准库 archive/zip

### 前端

- React 18
- TypeScript 5+
- Vite (构建工具)
- 原生 Fetch API

## 开发流程

1. 初始化 Go 模块和项目结构
2. 实现后端核心功能（认证、处理器、WebDAV）
3. 实现前端 React 应用
4. 集成测试
5. Docker 化部署

## 测试策略

- Go 单元测试（每个核心模块）
- 前端组件测试（可选）
- API 集成测试
- E2E 测试（可选）
