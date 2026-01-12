// Type definitions for the application

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
}

export interface ListResponse {
  path: string;
  files: FileInfo[];
}

export interface SearchResult {
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

export interface UploadResponse {
  success: boolean;
  files: string[];
  count: number;
}

export interface DeleteResponse {
  success: boolean;
  path: string;
}
