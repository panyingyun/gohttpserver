package archive

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// CreateZip creates a zip archive of the given directory and writes it to the writer
func CreateZip(rootDir, targetPath string, w io.Writer) error {
	zw := zip.NewWriter(w)
	defer zw.Close()

	basePath := filepath.Join(rootDir, targetPath)
	info, err := os.Stat(basePath)
	if err != nil {
		return err
	}

	if !info.IsDir() {
		// Single file
		return addFileToZip(zw, basePath, targetPath, rootDir)
	}

	// Directory - walk and add all files
	return filepath.Walk(basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return err
		}

		// Use forward slashes in zip (zip standard)
		zipPath := filepath.ToSlash(relPath)

		if info.IsDir() {
			// Create directory entry in zip
			_, err := zw.Create(zipPath + "/")
			return err
		}

		return addFileToZip(zw, path, zipPath, rootDir)
	})
}

func addFileToZip(zw *zip.Writer, filePath, zipPath, rootDir string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}

	header.Name = zipPath
	header.Method = zip.Deflate

	writer, err := zw.CreateHeader(header)
	if err != nil {
		return err
	}

	_, err = io.Copy(writer, file)
	return err
}

// SanitizePath ensures the path is safe and within root directory
func SanitizePath(rootDir, requestedPath string) (string, error) {
	// Clean the path to prevent directory traversal
	cleanPath := filepath.Clean(requestedPath)

	// Remove leading slashes
	cleanPath = strings.TrimPrefix(cleanPath, "/")
	cleanPath = strings.TrimPrefix(cleanPath, "\\")

	// Build full path
	fullPath := filepath.Join(rootDir, cleanPath)

	// Ensure the path is within root directory
	absRoot, err := filepath.Abs(rootDir)
	if err != nil {
		return "", err
	}

	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		return "", err
	}

	// Check if the resolved path is within root
	if !strings.HasPrefix(absPath, absRoot+string(filepath.Separator)) && absPath != absRoot {
		return "", os.ErrPermission
	}

	return cleanPath, nil
}
