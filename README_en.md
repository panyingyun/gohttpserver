# GHS Pro

<img src="docs/GHS.png" width="20%" height="20%">

A feature-rich static file server written in Go, with a React+TypeScript frontend, supporting file upload/download, directory compression, search, resumable downloads, access control, and HTTPS/WebDAV support.

## Features

- ✅ **File Upload/Download**: Support for multi-file upload and drag-and-drop upload
- ✅ **Directory Compression**: Pack directories into ZIP files for download
- ✅ **File Search**: Fuzzy search based on filenames with real-time search
- ✅ **Resumable Downloads**: Support for HTTP Range requests, enabling resumable downloads and concurrent downloads
- ✅ **Path Access Control**: Support for path-level allow/deny rules (with wildcard support)
- ✅ **HTTPS Support**: Support for TLS/SSL encrypted transmission
- ✅ **WebDAV Support**: Complete WebDAV protocol implementation
- ✅ **curl Friendly**: RESTful API design, convenient for command-line tool usage
- ✅ **Modern Frontend**: React + TypeScript, responsive design, drag-and-drop upload
- ✅ **File Management**: Frontend can view, upload, download, search, and delete files
- ✅ **File Sharing**: One-click share link generation with clipboard copy, supporting file and folder sharing

## Tech Stack

### Backend
- Go 1.23+
- Cobra (CLI framework)
- Standard library net/http
- Standard library archive/zip

### Frontend
- React 18
- TypeScript 5+
- Vite (build tool)

## Installation

### One-Click Installation [Highly Recommended]
```bash
docker rm -f gohttpserver

docker run -itd --restart=always -v /opt/gohttpserver:/data -p 8080:8080 -e AUTH=admin:password123 -e BASE_URL=http://[Your IP]:8080 --name gohttpserver harbor.michaelapp.com/gohttpserver/gohttpserver:v1.26 --upload --delete
```

### Local Docker Build Installation [Recommended]

```bash
git clone <repository-url>
cd gohttpserver
# Build image
docker rm -f gohttpserver
docker build -t gohttpserver:latest .

# Run container (no authentication, upload and delete disabled by default)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data -e BASE_URL=http://10.0.203.100:8080 gohttpserver:latest --upload --delete

# Run container (with authentication, using environment variables)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data -e AUTH=admin:password123 gohttpserver:latest

# Run container (enable upload and delete features)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data gohttpserver:latest --upload --delete

# Run container (with authentication and enable upload/delete features)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data -e AUTH=admin:password123 gohttpserver:latest --upload --delete

# Run container (configure share link address, recommended)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data -e BASE_URL=http://10.0.203.100:8080 gohttpserver:latest --upload --delete

# Run container (configure share link address using command-line parameters)
docker run -itd --name gohttpserver -p 8080:8080 -v $(pwd)/data:/data gohttpserver:latest --base-url http://10.0.203.100:8080 --upload --delete
```

### Build from Source [Not Recommended]

```bash
git clone <repository-url>
cd gohttpserver

# Build backend
cd backend
go mod download
go build -o gohttpserver ./cmd/server

# Build frontend
cd ../frontend
npm install
npm run build

# Run (need to copy frontend build artifacts to a location accessible by backend)
cd ../backend
./gohttpserver --root /data --port 8080 --web-dir ../frontend/dist
```

## Usage

### Basic Usage

```bash
# Start server (default port 8080, current directory)
./gohttpserver

# Specify root directory and port
./gohttpserver --root /path/to/files --port 9000

# Enable frontend (need to build frontend first)
./gohttpserver --root ./data --port 8080 --web-dir ./frontend/dist

# Enable HTTPS
./gohttpserver --https --cert cert.pem --key key.pem

# Enable HTTP Basic authentication
./gohttpserver --auth "username:password"

# Enable file upload feature (disabled by default)
./gohttpserver --upload

# Enable file delete feature (disabled by default)
./gohttpserver --delete

# Enable both upload and delete features
./gohttpserver --upload --delete

# Enable WebDAV (enabled by default)
./gohttpserver --webdav

# Configure base URL for share links (for intranet or domain access)
./gohttpserver --base-url http://10.0.203.100:8080

# Use environment variable to configure base URL
BASE_URL=http://10.0.203.100:8080 ./gohttpserver
```

### Command-Line Parameters

| Parameter | Short | Description | Default |
|-----------|-------|-------------|---------|
| `--root` | `-r` | Server root directory | `.` (current directory) |
| `--port` | `-p` | HTTP port | `8080` |
| `--https-port` | | HTTPS port | `8443` |
| `--https` | | Enable HTTPS | `false` |
| `--cert` | | TLS certificate file path | |
| `--key` | | TLS private key file path | |
| `--auth` | | HTTP Basic authentication (format: username:password, can also be set via AUTH environment variable) | |
| `--allow-paths` | | Allowed path list (comma-separated, supports wildcards) | |
| `--deny-paths` | | Denied path list (comma-separated, supports wildcards) | |
| `--webdav` | | Enable WebDAV support | `true` |
| `--upload` | | Enable file upload feature | `false` |
| `--delete` | | Enable file delete feature | `false` |
| `--web-dir` | | Frontend files directory | |
| `--base-url` | | Base URL for share links (e.g., http://10.0.203.100:8080 or https://example.com:8080). Can also be set via BASE_URL environment variable. If not set, uses current access address | |

### Access Control Examples

```bash
# Only allow access to /public and /shared directories
./gohttpserver --allow-paths "/public,/shared"

# Deny access to /private directory
./gohttpserver --deny-paths "/private"

# Combined usage: allow /public, deny /public/secret
./gohttpserver --allow-paths "/public" --deny-paths "/public/secret"
```

**Note**: Access control priority: `deny` > `allow` > default policy (allow)

## API Endpoints

### File List

```bash
# Get file list
curl http://localhost:8080/api/list?path=/

# With authentication
curl -u username:password http://localhost:8080/api/list?path=/subdir
```

### File Download

```bash
# Download file
curl -O http://localhost:8080/api/download/path/to/file.txt

# Resumable download (supports Range requests)
curl -C - -O http://localhost:8080/api/download/large-file.zip
```

### Directory Compression Download

```bash
# Download directory as ZIP
curl -O http://localhost:8080/api/zip/path/to/directory
```

### File Upload

**Note**: Requires starting with `--upload` flag to enable upload feature.

```bash
# Single file upload
curl -X POST -F "file=@/path/to/file.txt" -F "path=/" http://localhost:8080/api/upload

# Multiple file upload
curl -X POST -F "files=@file1.txt" -F "files=@file2.txt" -F "path=/uploads" http://localhost:8080/api/upload
```

### File Search

```bash
# Search files
curl "http://localhost:8080/api/search?q=keyword"

# Limit search results
curl "http://localhost:8080/api/search?q=keyword&max=50"
```

### Delete File/Directory

**Note**: Requires starting with `--delete` flag to enable delete feature.

```bash
# Delete file
curl -X DELETE http://localhost:8080/api/delete/path/to/file.txt
```

## Web Interface

Access `http://localhost:8080/` to use the web interface:

- 📁 Browse files and directories (table view)
- 🔍 Real-time file search
- 📤 Drag-and-drop file upload
- ⬇️ Download files and directories (ZIP)
- 🔗 Share files and folders (one-click copy share link)
- 🗑️ Delete files/directories
- 🧭 Breadcrumb navigation

### Sharing Feature

The web interface supports sharing for both files and folders:

- **File Sharing**: Click the "Share" button in the file list, the system will automatically generate a direct download link for the file and copy it to the clipboard
- **Folder Sharing**: Click the "Share" button for a folder, the system will generate a page link with path parameters that automatically navigates to the corresponding directory when opened
- **Visual Feedback**: After successful copy, the share button icon briefly changes to ✓, indicating successful copy
- **Use Cases**: Share links can be sent to others for easy collaboration and file distribution

**Configure Share Link Address**:
- Use `--base-url` parameter or `BASE_URL` environment variable to configure at runtime without rebuilding the image:
  ```bash
  # Using command-line parameter
  ./gohttpserver --base-url http://10.0.203.100:8080
  
  # Using environment variable
  BASE_URL=http://10.0.203.100:8080 ./gohttpserver
  
  # In Docker
  docker run -e BASE_URL=http://10.0.203.100:8080 ... gohttpserver:latest
  ```
- If not specified, will use the current access address (`window.location.origin`)
- This is particularly useful for intranet deployments or domain access scenarios, ensuring share links always point to the correct address

## WebDAV Usage

After enabling WebDAV, you can use any WebDAV client to access:

```bash
# Using curl
curl -X PROPFIND http://localhost:8080/

# Using cadaver (WebDAV client)
cadaver http://localhost:8080/
```

### WebDAV Supported Methods

- `GET/HEAD`: Read files
- `PUT`: Upload files
- `DELETE`: Delete files/directories
- `MKCOL`: Create directories
- `PROPFIND`: List directory contents
- `MOVE/COPY`: Move/copy

## Development

### Project Structure

```
gohttpserver/
├── README.md
├── Dockerfile
├── backend/              # Go backend
│   ├── cmd/
│   ├── internal/
│   ├── go.mod
│   └── README.md
└── frontend/             # React frontend
    ├── src/
    ├── public/
    ├── package.json
    └── README.md
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # Development mode with hot reload
```

The frontend development server runs on `http://localhost:3000` and automatically proxies API requests to the backend.

### Backend Development

```bash
cd backend
go run ./cmd/server --root ../data --port 8080 --web-dir ../frontend/dist
```

For detailed development documentation, please refer to:
- [backend/README.md](backend/README.md) - Backend development documentation
- [frontend/README.md](frontend/README.md) - Frontend development documentation

## Docker Usage

### Build Image

```bash
# Build image
docker build -t gohttpserver:latest .
```

### Run Container

```bash
# Basic run
docker run -d \
  --name gohttpserver \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  gohttpserver:latest

# Configure share link address (recommended: use environment variable)
docker run -d \
  --name gohttpserver \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  -e BASE_URL=http://10.0.203.100:8080 \
  gohttpserver:latest

# Configure share link address (using command-line parameters)
docker run -d \
  --name gohttpserver \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  gohttpserver:latest --base-url http://10.0.203.100:8080
```

**Note**: 
- Use `--base-url` parameter or `BASE_URL` environment variable to configure share link address at runtime without rebuilding the image
- If not specified, will use the current access address (`window.location.origin`)
- Recommended to specify in production environments to ensure share link correctness

## Caddy Reverse Proxy Configuration

If using Caddy as a reverse proxy (recommended for production), special attention is needed for large file upload and download configuration.

### Key Configuration

1. **Request Body Size Limit**: Must set a large enough `max_size` (default 100MB may not be sufficient)

```caddy
request_body {
    max_size 10GB  # Adjust according to actual needs
}
```

2. **Timeout Settings**: Large file transfers require setting timeout to 0 (unlimited)

```caddy
reverse_proxy localhost:8080 {
    transport http {
        read_timeout 0      # Large file downloads
        write_timeout 0     # Large file uploads
        response_header_timeout 0
    }
}
```

### Complete Configuration Example

The project root provides a `Caddyfile` configuration file with a complete configuration example. For detailed instructions, please refer to [docs/caddy-config.md](docs/caddy-config.md).

### Quick Start

```bash
# 1. Copy configuration file
sudo cp Caddyfile /etc/caddy/Caddyfile

# 2. Validate configuration
sudo caddy validate

# 3. Reload configuration
sudo systemctl reload caddy
```

## Security Recommendations

1. **Use HTTPS in Production**: Always use the `--https` option and configure valid TLS certificates, or use reverse proxies like Caddy to provide HTTPS
2. **Enable Authentication**: Use the `--auth` option or `AUTH` environment variable to set username and password (format: username:password)
3. **Path Access Control**: Use `--allow-paths` and `--deny-paths` to limit access scope
4. **Firewall Configuration**: Only open necessary ports
5. **Regular Updates**: Keep Go version and dependency libraries updated

## License

This project is licensed under the GPL-3.0 License. See the [LICENSE](LICENSE) file for details.

## Contributing

Issues and Pull Requests are welcome!

## Support the Author

If you find gohttpserver helpful, please consider buying the author a coffee ☕

<div style="display: flex; gap: 10px;">
  <img src="docs/alipay.jpg" alt="Alipay" width="200" height="373"/>
  <img src="docs/wcpay.png" alt="WeChat Pay" width="200" height="373"/>
</div>
