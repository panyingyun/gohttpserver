package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

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
	rootCmd.Flags().StringVar(&auth, "auth", "", "HTTP Basic Auth (format: username:password)")
	rootCmd.Flags().StringVar(&allowPaths, "allow-paths", "", "Comma-separated list of allowed paths (supports wildcards)")
	rootCmd.Flags().StringVar(&denyPaths, "deny-paths", "", "Comma-separated list of denied paths (supports wildcards)")
	rootCmd.Flags().BoolVar(&enableWebDAV, "webdav", true, "Enable WebDAV support (default: true)")
	rootCmd.Flags().BoolVar(&enableUpload, "upload", false, "Enable file upload functionality (default: false)")
	rootCmd.Flags().BoolVar(&enableDelete, "delete", false, "Enable file delete functionality (default: false)")
	rootCmd.Flags().StringVar(&webDir, "web-dir", "", "Directory for web frontend files (default: empty, no frontend)")
}

func runServer(cmd *cobra.Command, args []string) error {
	config := &server.Config{
		RootDir:      rootDir,
		Port:         port,
		HTTPSPort:    httpsPort,
		HTTPS:        https,
		CertFile:     certFile,
		KeyFile:      keyFile,
		Auth:         auth,
		AllowPaths:   parsePaths(allowPaths),
		DenyPaths:    parsePaths(denyPaths),
		EnableWebDAV: enableWebDAV,
		EnableUpload: enableUpload,
		EnableDelete: enableDelete,
		WebDir:       webDir,
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
		httpServer.Shutdown(nil)
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
