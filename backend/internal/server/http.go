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
	BaseURL      string // Base URL for sharing (e.g., http://10.0.203.100:8080)
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
		if err != nil {
			fmt.Printf("Warning: Failed to resolve web directory path '%s': %v\n", config.WebDir, err)
		} else {
			fmt.Printf("Web directory: %s\n", webDir)
			if info, err := os.Stat(webDir); err != nil {
				fmt.Printf("Warning: Web directory does not exist or is not accessible: %s, error: %v\n", webDir, err)
			} else if !info.IsDir() {
				fmt.Printf("Warning: Web directory path is not a directory: %s\n", webDir)
			} else {
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
							fmt.Printf("Serving root path, checking index.html at: %s\n", indexPath)
							if _, err := os.Stat(indexPath); err == nil {
								fmt.Printf("Found index.html, serving...\n")
								serveIndexHTML(w, r, indexPath, config.BaseURL)
								return
							} else {
								fmt.Printf("index.html not found at %s, error: %v\n", indexPath, err)
							}
						}
						
						// For other paths, serve files directly
						// Remove leading slash and join with webDir
						requestPath := strings.TrimPrefix(path, "/")
						if requestPath == "" {
							requestPath = "index.html"
						}
						filePath := filepath.Join(webDir, requestPath)
						
						fmt.Printf("Checking file: %s\n", filePath)
						
						// Check if file exists
						if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
							// If it's index.html, inject config
							if requestPath == "index.html" || strings.HasSuffix(requestPath, "/index.html") {
								serveIndexHTML(w, r, filePath, config.BaseURL)
								return
							}
							fmt.Printf("Found file, serving: %s\n", filePath)
							http.ServeFile(w, r, filePath)
							return
						}
						
						// If not found, try index.html for directory requests
						if strings.HasSuffix(path, "/") {
							indexPath := filepath.Join(webDir, "index.html")
							if _, err := os.Stat(indexPath); err == nil {
								serveIndexHTML(w, r, indexPath, config.BaseURL)
								return
							}
						}
						
					// Otherwise return 404
					fmt.Printf("404: File not found for path: %s, webDir: %s, checked filePath: %s\n", r.URL.Path, webDir, filePath)
					http.NotFound(w, r)
				})
				fmt.Printf("Static file handler registered for web directory: %s\n", webDir)
			}
		}
	} else {
		fmt.Printf("Web directory not configured (WebDir is empty)\n")
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
		ReadTimeout:  0,                 // 0 means no timeout - important for large file uploads
		WriteTimeout: 0,                 // 0 means no timeout - important for large file downloads
		IdleTimeout:  300 * time.Second, // Increased for long connections (5 minutes)
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

// serveIndexHTML serves index.html with injected configuration script
func serveIndexHTML(w http.ResponseWriter, r *http.Request, indexPath string, baseURL string) {
	// Read index.html file
	content, err := os.ReadFile(indexPath)
	if err != nil {
		http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
		return
	}

	htmlContent := string(content)

	// If BaseURL is set, inject configuration script before </head>
	if baseURL != "" {
		// Remove trailing slash if present
		baseURL = strings.TrimSuffix(baseURL, "/")
		configScript := fmt.Sprintf(`<script>window.__GOHTTPSERVER_CONFIG__={baseURL:"%s"};</script>`, baseURL)
		
		// Try to inject before </head>
		if strings.Contains(htmlContent, "</head>") {
			htmlContent = strings.Replace(htmlContent, "</head>", configScript+"</head>", 1)
		} else if strings.Contains(htmlContent, "<body>") {
			// Fallback: inject before <body> if </head> not found
			htmlContent = strings.Replace(htmlContent, "<body>", configScript+"<body>", 1)
		} else {
			// Last resort: prepend to content
			htmlContent = configScript + htmlContent
		}
	}

	// Set content type
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(htmlContent))
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
