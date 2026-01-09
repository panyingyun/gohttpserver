# Frontend - React TypeScript Application

基于 React 18 + TypeScript 的现代化前端应用。

## 目录结构

```
frontend/
├── public/
│   └── index.html          # HTML 模板
├── src/
│   ├── components/         # React 组件
│   │   ├── FileList.tsx    # 文件列表组件
│   │   ├── Header.tsx      # 头部组件
│   │   └── Sidebar.tsx     # 侧边栏组件
│   ├── services/
│   │   └── api.ts          # API 客户端
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   ├── utils/
│   │   └── format.ts       # 工具函数
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── package.json
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── tailwind.config.js      # Tailwind CSS 配置
└── postcss.config.js       # PostCSS 配置
```

## 功能特性

- 📁 文件列表浏览
- 📤 文件上传（支持拖拽）
- 📥 文件下载
- 🔍 实时文件搜索
- 🗑️ 文件删除
- 📦 目录 ZIP 下载
- 🎨 现代化 UI（Tailwind CSS）
- 🌓 深色模式支持

## 开发

### 前置要求

- Node.js 20+
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Material Symbols** - 图标库

## 环境变量

前端通过 `src/services/api.ts` 中的 `API_BASE` 配置后端 API 地址。

默认值：`/api`

## 与后端集成

前端构建后，将 `dist/` 目录的内容复制到后端的 `--web-dir` 指定的目录，后端会自动提供静态文件服务。
