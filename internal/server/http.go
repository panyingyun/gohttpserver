package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

)

// Config holds server configuration
type Config struct {
	RootDir      string
	Port         int
	HTTPSPort    int
	HTTPS        bool
	CertFile     string
	KeyFile      string
	Auth         string // username:password
	AllowPaths   []string
	DenyPaths    []string
	EnableWebDAV bool
	EnableUpload bool
	EnableDelete bool
	WebDir       string // Directory for web frontend files
}

// HTTPServer wraps the HTTP server
type HTTPServer struct {
	config *Config
	server *http.Server
}

// NewHTTPServer creates a new HTTP server instance
func NewHTTPServer(config *Config) (*HTTPServer, error) {
	// Validate root directory
	rootDir, err := filepath.Abs(config.RootDir)
	if err != nil {
		return nil, fmt.Errorf("invalid root directory: %w", err)
	}

	info, err := os.Stat(rootDir)
	if err != nil {
		return nil, fmt.Errorf("root directory does not exist: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("root path is not a directory")
	}

	config.RootDir = rootDir

	// Parse auth
	var basicAuth *BasicAuth
	if config.Auth != "" {
		parts := splitAuth(config.Auth)
		if len(parts) == 2 {
			basicAuth = NewBasicAuth(parts[0], parts[1])
		}
	} else {
		basicAuth = NewBasicAuth("", "")
	}

	// Create path ACL
	pathACL := NewPathACL(config.AllowPaths, config.DenyPaths)

	// Create server instance
	srv := NewServer(config.RootDir, basicAuth, pathACL)

	// Setup routes
	mux := http.NewServeMux()

	// Create auth middleware
	authMW := AuthMiddleware(basicAuth, pathACL)

	// Regular HTTP handlers - API routes must be registered before static file handler
	mux.HandleFunc("/api/list", authMW(http.HandlerFunc(srv.HandleListFiles)).ServeHTTP)
	mux.HandleFunc("/api/files", authMW(http.HandlerFunc(srv.HandleListFiles)).ServeHTTP) // Alias
	mux.HandleFunc("/api/search", authMW(http.HandlerFunc(srv.HandleSearch)).ServeHTTP)
	mux.HandleFunc("/api/download/", authMW(http.HandlerFunc(srv.HandleDownload)).ServeHTTP)
	mux.HandleFunc("/api/zip/", authMW(http.HandlerFunc(srv.HandleZip)).ServeHTTP)
	
	// Upload handlers - only register if upload is enabled
	if config.EnableUpload {
		mux.HandleFunc("/api/upload", authMW(http.HandlerFunc(srv.HandleUpload)).ServeHTTP)
		mux.HandleFunc("/api/upload/", authMW(http.HandlerFunc(srv.HandleUpload)).ServeHTTP)
	} else {
		// Return 403 Forbidden if upload is disabled
		mux.HandleFunc("/api/upload", func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "File upload is disabled. Use --upload flag to enable.", http.StatusForbidden)
		})
		mux.HandleFunc("/api/upload/", func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "File upload is disabled. Use --upload flag to enable.", http.StatusForbidden)
		})
	}
	
	// Delete handlers - only register if delete is enabled
	if config.EnableDelete {
		mux.HandleFunc("/api/delete/", authMW(http.HandlerFunc(srv.HandleDelete)).ServeHTTP)
	} else {
		// Return 403 Forbidden if delete is disabled
		mux.HandleFunc("/api/delete/", func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "File delete is disabled. Use --delete flag to enable.", http.StatusForbidden)
		})
	}

	// Serve static web files if WebDir is set
	// Note: This must be registered AFTER API routes to avoid conflicts
	// Static files should NOT go through auth middleware as they are frontend resources
	if config.WebDir != "" {
		webDir, err := filepath.Abs(config.WebDir)
		if err == nil {
			if info, err := os.Stat(webDir); err == nil && info.IsDir() {
				// Use a custom handler to skip API paths and handle index.html
				// This handler is NOT wrapped with authMW to allow public access to frontend
				mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
						// Skip API routes
						if strings.HasPrefix(r.URL.Path, "/api/") {
							http.NotFound(w, r)
							return
						}
						
						// If path is root, serve index.html
						path := r.URL.Path
						if path == "/" {
							indexPath := filepath.Join(webDir, "index.html")
							if _, err := os.Stat(indexPath); err == nil {
								http.ServeFile(w, r, indexPath)
								return
							}
						}
						
						// For other paths, serve files directly
						// Remove leading slash and join with webDir
						requestPath := strings.TrimPrefix(path, "/")
						if requestPath == "" {
							requestPath = "index.html"
						}
						filePath := filepath.Join(webDir, requestPath)
						
						// Check if file exists
						if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
							http.ServeFile(w, r, filePath)
							return
						}
						
						// If not found, try index.html for directory requests
						if strings.HasSuffix(path, "/") {
							indexPath := filepath.Join(webDir, "index.html")
							if _, err := os.Stat(indexPath); err == nil {
								http.ServeFile(w, r, indexPath)
								return
							}
						}
						
					// Otherwise return 404
					http.NotFound(w, r)
				})
			}
		}
	}

	// Apply middleware
	handler := CORSMiddleware(LoggingMiddleware(mux))

	port := config.Port
	if config.HTTPS && config.HTTPSPort > 0 {
		port = config.HTTPSPort
	}

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return &HTTPServer{
		config: config,
		server: httpServer,
	}, nil
}

// Start starts the HTTP server
func (hs *HTTPServer) Start() error {
	addr := hs.server.Addr
	if hs.config.HTTPS {
		if hs.config.CertFile == "" || hs.config.KeyFile == "" {
			return fmt.Errorf("cert and key files are required for HTTPS")
		}
		fmt.Printf("Starting HTTPS server on %s\n", addr)
		return hs.server.ListenAndServeTLS(hs.config.CertFile, hs.config.KeyFile)
	}

	fmt.Printf("Starting HTTP server on %s\n", addr)
	fmt.Printf("Root directory: %s\n", hs.config.RootDir)
	return hs.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (hs *HTTPServer) Shutdown(ctx context.Context) error {
	return hs.server.Shutdown(ctx)
}

// splitAuth splits auth string into username and password
func splitAuth(auth string) []string {
	parts := make([]string, 0, 2)
	for i, sep := range auth {
		if sep == ':' {
			parts = append(parts, auth[:i], auth[i+1:])
			break
		}
	}
	if len(parts) == 0 {
		parts = append(parts, auth)
	}
	return parts
}
