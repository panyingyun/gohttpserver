package webdav

import (
	"encoding/xml"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

// Handler implements WebDAV protocol
type Handler struct {
	rootDir string
}

// NewHandler creates a new WebDAV handler
func NewHandler(rootDir string) *Handler {
	return &Handler{
		rootDir: rootDir,
	}
}

// ServeHTTP handles WebDAV requests
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	fullPath := filepath.Join(h.rootDir, path)

	switch r.Method {
	case "GET", "HEAD":
		h.handleGet(w, r, fullPath)
	case "PUT":
		h.handlePut(w, r, fullPath)
	case "DELETE":
		h.handleDelete(w, r, fullPath)
	case "MKCOL":
		h.handleMkcol(w, r, fullPath)
	case "PROPFIND":
		h.handlePropfind(w, r, fullPath)
	case "MOVE":
		h.handleMove(w, r, fullPath)
	case "COPY":
		h.handleCopy(w, r, fullPath)
	case "OPTIONS":
		h.handleOptions(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleGet(w http.ResponseWriter, r *http.Request, fullPath string) {
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
		http.Error(w, "Is a directory", http.StatusForbidden)
		return
	}

	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func (h *Handler) handlePut(w http.ResponseWriter, r *http.Request, fullPath string) {
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
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

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request, fullPath string) {
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

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleMkcol(w http.ResponseWriter, r *http.Request, fullPath string) {
	if err := os.MkdirAll(fullPath, 0o755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) handleMove(w http.ResponseWriter, r *http.Request, fullPath string) {
	dst := r.Header.Get("Destination")
	if dst == "" {
		http.Error(w, "Missing Destination header", http.StatusBadRequest)
		return
	}

	dstURL, err := url.ParseRequestURI(dst)
	if err != nil {
		http.Error(w, "Invalid Destination header", http.StatusBadRequest)
		return
	}

	dstPath := filepath.Join(h.rootDir, dstURL.Path)
	if err := os.Rename(fullPath, dstPath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) handleCopy(w http.ResponseWriter, r *http.Request, fullPath string) {
	dst := r.Header.Get("Destination")
	if dst == "" {
		http.Error(w, "Missing Destination header", http.StatusBadRequest)
		return
	}

	dstURL, err := url.ParseRequestURI(dst)
	if err != nil {
		http.Error(w, "Invalid Destination header", http.StatusBadRequest)
		return
	}

	dstPath := filepath.Join(h.rootDir, dstURL.Path)

	srcInfo, err := os.Stat(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if srcInfo.IsDir() {
		if err := copyDir(fullPath, dstPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err := copyFile(fullPath, dstPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) handlePropfind(w http.ResponseWriter, r *http.Request, fullPath string) {
	depth := r.Header.Get("Depth")
	if depth == "" {
		depth = "0"
	}

	info, err := os.Stat(fullPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	responses := []propfindResponse{}
	responses = append(responses, h.buildResponse(fullPath, info))

	if depth == "1" || depth == "infinity" {
		if info.IsDir() {
			entries, err := os.ReadDir(fullPath)
			if err == nil {
				for _, entry := range entries {
					entryInfo, err := entry.Info()
					if err == nil {
						entryPath := filepath.Join(fullPath, entry.Name())
						responses = append(responses, h.buildResponse(entryPath, entryInfo))
					}
				}
			}
		}
	}

	multistatus := multistatus{
		Responses: responses,
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusMultiStatus)
	xml.NewEncoder(w).Encode(multistatus)
}

func (h *Handler) handleOptions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("DAV", "1,2")
	w.Header().Set("Allow", "OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, MOVE, COPY")
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) buildResponse(fullPath string, info os.FileInfo) propfindResponse {
	relPath, _ := filepath.Rel(h.rootDir, fullPath)
	if relPath == "." {
		relPath = "/"
	} else {
		relPath = "/" + filepath.ToSlash(relPath)
	}

	propstat := propstat{
		Status: "HTTP/1.1 200 OK",
		Prop: prop{
			DisplayName:      info.Name(),
			ResourceType:     resourceType{Collection: info.IsDir()},
			GetContentLength: fmt.Sprintf("%d", info.Size()),
			GetLastModified:  info.ModTime().Format(time.RFC1123),
		},
	}

	return propfindResponse{
		Href:     relPath,
		Propstat: propstat,
	}
}

// WebDAV XML structures
type multistatus struct {
	XMLName   xml.Name           `xml:"DAV:multistatus"`
	Responses []propfindResponse `xml:"response"`
}

type propfindResponse struct {
	Href     string   `xml:"href"`
	Propstat propstat `xml:"propstat"`
}

type propstat struct {
	Prop   prop   `xml:"prop"`
	Status string `xml:"status"`
}

type prop struct {
	DisplayName      string       `xml:"displayname"`
	ResourceType     resourceType `xml:"resourcetype"`
	GetContentLength string       `xml:"getcontentlength"`
	GetLastModified  string       `xml:"getlastmodified"`
}

type resourceType struct {
	Collection bool `xml:",chardata"`
}

// Helper functions
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	dstDir := filepath.Dir(dst)
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		return err
	}

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		return copyFile(path, dstPath)
	})
}
