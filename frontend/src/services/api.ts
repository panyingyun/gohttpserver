// API service for communicating with backend

import type {
  ListResponse,
  SearchResponse,
  UploadResponse,
  DeleteResponse,
} from '../types';

const API_BASE = '/api';

// Helper function to handle fetch errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('需要认证，请使用支持 Basic Auth 的客户端');
    }
    if (response.status === 403) {
      throw new Error('访问被拒绝');
    }
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

// List files in a directory
export async function listFiles(path: string = '/'): Promise<ListResponse> {
  const url = `${API_BASE}/list?path=${encodeURIComponent(path)}`;
  const response = await fetch(url);
  return handleResponse<ListResponse>(response);
}

// Search files
export async function searchFiles(
  query: string,
  maxResults: number = 100
): Promise<SearchResponse> {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&max=${maxResults}`;
  const response = await fetch(url);
  return handleResponse<SearchResponse>(response);
}

// Upload files with progress callback
export function uploadFilesWithProgress(
  files: File[],
  path: string = '/',
  onProgress?: (fileIndex: number, progress: number, loaded: number, total: number) => void
): Promise<UploadResponse[]> {
  return Promise.all(
    files.map((file, index) => {
      return new Promise<UploadResponse>((resolve, reject) => {
        const formData = new FormData();
        formData.append('path', path);
        formData.append('files', file);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(index, progress, e.loaded, e.total);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText) as UploadResponse;
              resolve(response);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            if (xhr.status === 401) {
              reject(new Error('需要认证，请使用支持 Basic Auth 的客户端'));
            } else if (xhr.status === 403) {
              reject(new Error('访问被拒绝'));
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${API_BASE}/upload`);
        xhr.send(formData);
      });
    })
  );
}

// Upload files (backward compatible, without progress)
export async function uploadFiles(
  files: File[],
  path: string = '/'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('path', path);
  for (const file of files) {
    formData.append('files', file);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

// Delete file or directory
export async function deleteFile(path: string): Promise<DeleteResponse> {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}/delete${normalizedPath}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });
  return handleResponse<DeleteResponse>(response);
}

// Get download URL
export function getDownloadUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}/download${normalizedPath}`;
}

// Get zip download URL
export function getZipUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}/zip${normalizedPath}`;
}
