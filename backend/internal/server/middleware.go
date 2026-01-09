package server

import "net/http"

// LoggingMiddleware logs HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simple logging - can be enhanced with structured logging
		next.ServeHTTP(w, r)
	})
}

// CORSMiddleware adds CORS headers
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// AuthMiddleware wraps handlers with authentication and path ACL
func AuthMiddleware(basicAuth *BasicAuth, pathACL *PathACL) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check path ACL first
			path := r.URL.Path
			if !pathACL.IsAllowed(path) {
				http.Error(w, "Access denied", http.StatusForbidden)
				return
			}

			// Check Basic Auth
			if !basicAuth.Authenticate(r) {
				basicAuth.RequireAuth(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
