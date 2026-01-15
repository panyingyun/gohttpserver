# Caddy 代理配置指南

本文档说明如何配置 Caddy 反向代理以确保 gohttpserver 的上传和下载功能正常工作。

## 关键配置要点

### 1. 请求体大小限制

对于大文件上传，必须设置足够大的 `max_size`：

```caddy
request_body {
    max_size 10GB  # 根据实际需求调整，默认是 100MB
}
```

### 2. 超时设置

大文件上传和下载需要较长时间，必须将超时设置为 0（无限制）：

```caddy
transport http {
    read_timeout 0      # 从后端读取响应的超时（大文件下载）
    write_timeout 0     # 向后端写入请求的超时（大文件上传）
    response_header_timeout 0
}
```

### 3. 后端服务地址

确保后端服务正在运行，默认端口是 8080：

```caddy
reverse_proxy localhost:8080
```

## 快速开始

### 1. 安装 Caddy

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 或者使用官方安装脚本
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/setup.deb.sh' | sudo bash
sudo apt install caddy
```

### 2. 配置 Caddyfile

将项目根目录的 `Caddyfile` 复制到 Caddy 配置目录：

```bash
# 复制配置文件
sudo cp Caddyfile /etc/caddy/Caddyfile

# 或者如果使用项目目录的配置
sudo cp Caddyfile /etc/caddy/Caddyfile
```

### 3. 测试配置

```bash
# 检查配置文件语法
sudo caddy validate --config /etc/caddy/Caddyfile

# 如果使用默认路径
sudo caddy validate
```

### 4. 启动/重载 Caddy

```bash
# 启动 Caddy
sudo systemctl start caddy

# 重载配置（不中断服务）
sudo systemctl reload caddy

# 查看状态
sudo systemctl status caddy

# 查看日志
sudo journalctl -u caddy -f
```

## 常见问题

### 问题 1: 上传大文件时出现 413 Request Entity Too Large

**解决方案**: 增加 `request_body` 的 `max_size`：

```caddy
request_body {
    max_size 10GB  # 增加到足够大的值
}
```

### 问题 2: 上传或下载时连接超时

**解决方案**: 将超时设置为 0（无限制）：

```caddy
transport http {
    read_timeout 0
    write_timeout 0
    response_header_timeout 0
}
```

### 问题 3: 上传过程中连接中断

**解决方案**: 
1. 确保超时设置为 0
2. 增加 `keepalive` 相关设置
3. 检查网络稳定性

```caddy
reverse_proxy localhost:8080 {
    keepalive 32
    keepalive_interval 30s
    transport http {
        read_timeout 0
        write_timeout 0
    }
}
```

### 问题 4: 后端服务无法访问

**解决方案**: 
1. 确认后端服务正在运行：`curl http://localhost:8080/api/list?path=/`
2. 检查防火墙设置
3. 确认端口号正确

## 高级配置

### 启用日志

```caddy
log {
    output file /var/log/caddy/access.log {
        roll_size 100MB
        roll_keep 10
    }
    format json
}
```

### 健康检查

```caddy
reverse_proxy localhost:8080 {
    health_uri /api/list?path=/
    health_interval 30s
    health_timeout 5s
}
```

### 负载均衡（多实例）

```caddy
reverse_proxy localhost:8080 localhost:8081 localhost:8082 {
    lb_policy round_robin
    health_uri /api/list?path=/
    health_interval 30s
}
```

## 验证配置

### 1. 测试小文件上传

```bash
curl -X POST -u yypan:Cjj123 \
  -F "files=@/tmp/small-file.txt" \
  -F "path=/" \
  https://files.michaelapp.com/api/upload
```

### 2. 测试大文件上传

```bash
# 创建一个 100MB 的测试文件
dd if=/dev/zero of=/tmp/large-file.bin bs=1M count=100

# 上传测试
curl -X POST -u yypan:Cjj123 \
  -F "files=@/tmp/large-file.bin" \
  -F "path=/" \
  https://files.michaelapp.com/api/upload
```

### 3. 测试大文件下载

```bash
# 使用 wget 测试断点续传
wget --continue --user=yypan --password=Cjj123 \
  https://files.michaelapp.com/api/download/path/to/large-file.bin
```

## 监控和调试

### 查看 Caddy 日志

```bash
# 实时查看访问日志
sudo tail -f /var/log/caddy/access.log

# 查看错误日志
sudo tail -f /var/log/caddy/error.log

# 查看系统日志
sudo journalctl -u caddy -f
```

### 查看后端服务日志

```bash
# 如果使用 Docker
docker logs -f gohttpserver

# 如果直接运行
# 查看标准输出
```

## 性能优化建议

1. **请求体大小**: 根据实际需求设置，不要设置过大
2. **连接池**: 使用 `keepalive` 保持连接
3. **压缩**: 对于文本文件可以启用压缩，但对于大文件可能不需要
4. **缓存**: 静态资源可以考虑使用缓存

## 安全建议

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **认证**: 使用后端的 Basic Auth 或 Caddy 的 basicauth
3. **访问控制**: 使用后端的路径访问控制功能
4. **日志**: 记录访问日志以便审计

## 参考资源

- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Caddy 反向代理配置](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy 请求体限制](https://caddyserver.com/docs/caddyfile/directives/request_body)
