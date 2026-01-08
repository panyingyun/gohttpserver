package search

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Result represents a search result
type Result struct {
	Path    string `json:"path"`
	IsDir   bool   `json:"is_dir"`
	Size    int64  `json:"size"`
	ModTime string `json:"mod_time"`
}

// Search performs a file search in the given root directory
func Search(rootDir, query string, maxResults int) ([]Result, error) {
	if maxResults <= 0 {
		maxResults = 100 // Default limit
	}

	var results []Result
	var mu sync.Mutex
	var wg sync.WaitGroup

	query = strings.ToLower(query)

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors, continue searching
		}

		mu.Lock()
		if len(results) >= maxResults {
			mu.Unlock()
			return filepath.SkipDir // Stop searching if limit reached
		}
		mu.Unlock()

		// Check if filename matches query
		filename := strings.ToLower(info.Name())
		if strings.Contains(filename, query) {
			relPath, err := filepath.Rel(rootDir, path)
			if err != nil {
				relPath = path
			}

			wg.Add(1)
			go func() {
				defer wg.Done()
				result := Result{
					Path:    relPath,
					IsDir:   info.IsDir(),
					Size:    info.Size(),
					ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
				}

				mu.Lock()
				if len(results) < maxResults {
					results = append(results, result)
				}
				mu.Unlock()
			}()
		}

		return nil
	})

	wg.Wait()
	return results, err
}
