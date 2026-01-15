package server

import (
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gohttpserver/internal/archive"
	"gohttpserver/internal/search"
)

// Server holds server configuration and dependencies
type Server struct {
	rootDir   string
	basicAuth *BasicAuth
	pathACL   *PathACL
}

// NewServer creates a new Server instance
func NewServer(rootDir string, basicAuth *BasicAuth, pathACL *PathACL) *Server {
	return &Server{
		rootDir:   rootDir,
		basicAuth: basicAuth,
		pathACL:   pathACL,
	}
}

// HandleListFiles returns file list as JSON
func (s *Server) HandleListFiles(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/"
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	fullPath := filepath.Join(s.rootDir, cleanPath)
	info, err := os.Stat(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if !info.IsDir() {
		http.Error(w, "Not a directory", http.StatusBadRequest)
		return
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var files []map[string]interface{}
	for _, entry := range entries {
		entryInfo, err := entry.Info()
		if err != nil {
			continue
		}

		entryPath := filepath.Join(cleanPath, entry.Name())
		if !s.pathACL.IsAllowed(entryPath) {
			continue
		}

		fileInfo := map[string]interface{}{
			"name":     entry.Name(),
			"path":     entryPath,
			"is_dir":   entry.IsDir(),
			"size":     entryInfo.Size(),
			"mod_time": entryInfo.ModTime().Format("2006-01-02 15:04:05"),
		}
		files = append(files, fileInfo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"path":  cleanPath,
		"files": files,
	})
}

// HandleSearch performs file search
func (s *Server) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	maxResults := 100
	if maxStr := r.URL.Query().Get("max"); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 {
			maxResults = m
		}
	}

	results, err := search.Search(s.rootDir, query, maxResults)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Filter by ACL
	var filteredResults []search.Result
	for _, result := range results {
		if s.pathACL.IsAllowed(result.Path) {
			filteredResults = append(filteredResults, result)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":   query,
		"results": filteredResults,
		"count":   len(filteredResults),
	})
}

// HandleDownload serves file download with Range support
func (s *Server) HandleDownload(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/download")
	if path == "" {
		path = "/"
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	fullPath := filepath.Join(s.rootDir, cleanPath)
	file, err := os.Open(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if info.IsDir() {
		http.Error(w, "Cannot download directory", http.StatusBadRequest)
		return
	}

	// Set content type
	contentType := mime.TypeByExtension(filepath.Ext(info.Name()))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", info.Name()))
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Connection", "keep-alive") // Keep connection alive for large downloads

	// Support Range requests for resumable downloads
	// http.ServeContent handles Range requests automatically and efficiently
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

// HandleZip creates and serves a zip archive of a directory
func (s *Server) HandleZip(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/zip")
	if path == "" {
		path = "/"
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	fullPath := filepath.Join(s.rootDir, cleanPath)
	info, err := os.Stat(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if !info.IsDir() {
		http.Error(w, "Not a directory", http.StatusBadRequest)
		return
	}

	// Set headers for zip download
	zipName := filepath.Base(cleanPath)
	if zipName == "." || zipName == "" {
		zipName = "archive"
	}
	zipName += ".zip"

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", zipName))

	// Create zip and stream to response
	if err := archive.CreateZip(s.rootDir, cleanPath, w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// HandleUpload handles file upload
func (s *Server) HandleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		s.handlePostUpload(w, r)
	} else if r.Method == "PUT" {
		s.handlePutUpload(w, r)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handlePostUpload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(100 << 20); err != nil { // 100MB max
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	uploadPath := r.FormValue("path")
	if uploadPath == "" {
		uploadPath = "/"
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, uploadPath)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	targetDir := filepath.Join(s.rootDir, cleanPath)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var uploadedFiles []string
	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		// Try single file
		file, header, err := r.FormFile("file")
		if err == nil {
			defer file.Close()
			filename := filepath.Base(header.Filename)
			targetPath := filepath.Join(targetDir, filename)

			dst, err := os.Create(targetPath)
			if err == nil {
				if _, err := io.Copy(dst, file); err == nil {
					uploadedFiles = append(uploadedFiles, filename)
				}
				dst.Close()
			}
		}
	} else {
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				continue
			}

			filename := filepath.Base(fileHeader.Filename)
			targetPath := filepath.Join(targetDir, filename)

			dst, err := os.Create(targetPath)
			if err != nil {
				file.Close()
				continue
			}

			if _, err := io.Copy(dst, file); err != nil {
				file.Close()
				dst.Close()
				continue
			}

			file.Close()
			dst.Close()
			uploadedFiles = append(uploadedFiles, filename)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"files":   uploadedFiles,
		"count":   len(uploadedFiles),
	})
}

func (s *Server) handlePutUpload(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/upload")
	if path == "" {
		http.Error(w, "Missing file path", http.StatusBadRequest)
		return
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	fullPath := filepath.Join(s.rootDir, cleanPath)

	// Create parent directory if needed
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	file, err := os.Create(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if _, err := io.Copy(file, r.Body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    cleanPath,
	})
}

// HandleDelete handles file/directory deletion
func (s *Server) HandleDelete(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/delete")
	if path == "" {
		http.Error(w, "Missing path", http.StatusBadRequest)
		return
	}

	cleanPath, err := archive.SanitizePath(s.rootDir, path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !s.pathACL.IsAllowed(cleanPath) {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	fullPath := filepath.Join(s.rootDir, cleanPath)
	info, err := os.Stat(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if info.IsDir() {
		if err := os.RemoveAll(fullPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.Remove(fullPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    cleanPath,
	})
}
