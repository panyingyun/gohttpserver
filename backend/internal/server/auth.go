package server

import (
	"encoding/base64"
	"net/http"
	"path/filepath"
	"strings"
)

// BasicAuth implements HTTP Basic Authentication
type BasicAuth struct {
	username string
	password string
}

// NewBasicAuth creates a new BasicAuth instance
func NewBasicAuth(username, password string) *BasicAuth {
	return &BasicAuth{
		username: username,
		password: password,
	}
}

// Authenticate checks if the request has valid Basic Auth credentials
func (ba *BasicAuth) Authenticate(r *http.Request) bool {
	if ba.username == "" && ba.password == "" {
		return true // No auth required
	}

	auth := r.Header.Get("Authorization")
	if auth == "" {
		return false
	}

	if !strings.HasPrefix(auth, "Basic ") {
		return false
	}

	encoded := strings.TrimPrefix(auth, "Basic ")
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return false
	}

	credentials := string(decoded)
	parts := strings.SplitN(credentials, ":", 2)
	if len(parts) != 2 {
		return false
	}

	return parts[0] == ba.username && parts[1] == ba.password
}

// RequireAuth adds WWW-Authenticate header to response
func (ba *BasicAuth) RequireAuth(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
	w.WriteHeader(http.StatusUnauthorized)
}

// PathACL manages path-level access control with wildcard support
type PathACL struct {
	allowPaths []string
	denyPaths  []string
}

// NewPathACL creates a new PathACL instance
func NewPathACL(allowPaths, denyPaths []string) *PathACL {
	return &PathACL{
		allowPaths: allowPaths,
		denyPaths:  denyPaths,
	}
}

// IsAllowed checks if a path is allowed based on ACL rules
// Priority: deny > allow > default (allow)
func (acl *PathACL) IsAllowed(path string) bool {
	// Normalize path
	path = filepath.Clean(path)
	if !filepath.IsAbs(path) {
		path = "/" + path
	}
	path = filepath.ToSlash(path)

	// Check deny list first (highest priority)
	for _, denyPath := range acl.denyPaths {
		if acl.matchPath(path, denyPath) {
			return false
		}
	}

	// If no allow rules, default to allow
	if len(acl.allowPaths) == 0 {
		return true
	}

	// Check allow list
	for _, allowPath := range acl.allowPaths {
		if acl.matchPath(path, allowPath) {
			return true
		}
	}

	// If allow list exists but no match, deny
	return false
}

// matchPath matches a path against a pattern with wildcard support
func (acl *PathACL) matchPath(path, pattern string) bool {
	pattern = filepath.Clean(pattern)
	if !filepath.IsAbs(pattern) {
		pattern = "/" + pattern
	}
	pattern = filepath.ToSlash(pattern)

	// Simple wildcard matching
	if strings.Contains(pattern, "*") || strings.Contains(pattern, "?") {
		return acl.wildcardMatch(path, pattern)
	}

	// Exact match or prefix match
	return strings.HasPrefix(path, pattern) || path == pattern
}

// wildcardMatch performs simple wildcard matching
func (acl *PathACL) wildcardMatch(path, pattern string) bool {
	patternParts := strings.Split(pattern, "*")
	if len(patternParts) == 1 {
		return path == pattern
	}

	if !strings.HasPrefix(path, patternParts[0]) {
		return false
	}

	remaining := path[len(patternParts[0]):]
	for i := 1; i < len(patternParts); i++ {
		part := patternParts[i]
		if part == "" {
			continue
		}
		idx := strings.Index(remaining, part)
		if idx == -1 {
			return false
		}
		remaining = remaining[idx+len(part):]
	}

	return true
}
