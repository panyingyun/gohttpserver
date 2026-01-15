package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"gohttpserver/internal/server"

	"github.com/spf13/cobra"
)

var (
	rootDir      string
	port         int
	httpsPort    int
	https        bool
	certFile     string
	keyFile      string
	auth         string
	allowPaths   string
	denyPaths    string
	enableWebDAV bool
	enableUpload bool
	enableDelete bool
	webDir       string
	baseURL      string
)

var rootCmd = &cobra.Command{
	Use:   "gohttpserver",
	Short: "A simple static file server with advanced features",
	Long: `A Go-based HTTP/HTTPS static file server with support for:
- File upload/download
- Directory compression (ZIP)
- File search
- Resumable downloads (Range requests)
- Path-level access control
- WebDAV support
- curl-friendly API
- React frontend`,
	RunE: runServer,
}

func init() {
	rootCmd.Flags().StringVarP(&rootDir, "root", "r", ".", "Root directory to serve (default: current directory)")
	rootCmd.Flags().IntVarP(&port, "port", "p", 8080, "HTTP port to listen on (default: 8080)")
	rootCmd.Flags().IntVar(&httpsPort, "https-port", 8443, "HTTPS port to listen on (default: 8443)")
	rootCmd.Flags().BoolVar(&https, "https", false, "Enable HTTPS")
	rootCmd.Flags().StringVar(&certFile, "cert", "", "TLS certificate file (required for HTTPS)")
	rootCmd.Flags().StringVar(&keyFile, "key", "", "TLS private key file (required for HTTPS)")
	rootCmd.Flags().StringVar(&auth, "auth", "", "HTTP Basic Auth (format: username:password, or set AUTH env var)")
	rootCmd.Flags().StringVar(&allowPaths, "allow-paths", "", "Comma-separated list of allowed paths (supports wildcards)")
	rootCmd.Flags().StringVar(&denyPaths, "deny-paths", "", "Comma-separated list of denied paths (supports wildcards)")
	rootCmd.Flags().BoolVar(&enableWebDAV, "webdav", true, "Enable WebDAV support (default: true)")
	rootCmd.Flags().BoolVar(&enableUpload, "upload", false, "Enable file upload functionality (default: false)")
	rootCmd.Flags().BoolVar(&enableDelete, "delete", false, "Enable file delete functionality (default: false)")
	rootCmd.Flags().StringVar(&webDir, "web-dir", "", "Directory for web frontend files (default: empty, no frontend)")
	rootCmd.Flags().StringVar(&baseURL, "base-url", "", "Base URL for sharing links (e.g., http://10.0.203.100:8080 or https://example.com:8080). If not set, uses current origin")
}

func runServer(cmd *cobra.Command, args []string) error {
	// Get auth from environment variable if not provided via flag
	authValue := auth
	if authValue == "" {
		authValue = os.Getenv("AUTH")
	}

	// Get rootDir from environment variable if not provided via flag
	rootDirValue := rootDir
	if rootDirValue == "." {
		if envRoot := os.Getenv("ROOT_DIR"); envRoot != "" {
			rootDirValue = envRoot
		}
	}

	// Get port from environment variable if not provided via flag
	portValue := port
	if envPort := os.Getenv("PORT"); envPort != "" && port == 8080 {
		if p, err := strconv.Atoi(envPort); err == nil {
			portValue = p
		}
	}

	// Get baseURL from environment variable if not provided via flag
	baseURLValue := baseURL
	if baseURLValue == "" {
		baseURLValue = os.Getenv("BASE_URL")
	}

	config := &server.Config{
		RootDir:      rootDirValue,
		Port:         portValue,
		HTTPSPort:    httpsPort,
		HTTPS:        https,
		CertFile:     certFile,
		KeyFile:      keyFile,
		Auth:         authValue,
		AllowPaths:   parsePaths(allowPaths),
		DenyPaths:    parsePaths(denyPaths),
		EnableWebDAV: enableWebDAV,
		EnableUpload: enableUpload,
		EnableDelete: enableDelete,
		WebDir:       webDir,
		BaseURL:      baseURLValue,
	}

	httpServer, err := server.NewHTTPServer(config)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\nShutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		httpServer.Shutdown(ctx)
	}()

	// Start server
	if err := httpServer.Start(); err != nil && err.Error() != "http: Server closed" {
		return fmt.Errorf("server error: %w", err)
	}

	return nil
}

func parsePaths(pathsStr string) []string {
	if pathsStr == "" {
		return nil
	}
	paths := strings.Split(pathsStr, ",")
	result := make([]string, 0, len(paths))
	for _, p := range paths {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
