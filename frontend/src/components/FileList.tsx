import React, { useState } from 'react';
import { formatSize } from '../utils/format';
import { getDownloadUrl, getZipUrl, deleteFile } from '../services/api';
import type { FileInfo } from '../types';

interface FileListProps {
  files: FileInfo[];
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onError: (error: string) => void;
}

const getFileIcon = (fileName: string, isDir: boolean): string => {
  if (isDir) return 'folder';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'picture_as_pdf';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'image';
    case 'zip':
    case 'rar':
    case '7z':
      return 'archive';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return 'movie';
    default:
      return 'description';
  }
};

const getFileIconColor = (fileName: string, isDir: boolean): string => {
  if (isDir) return 'text-primary dark:text-blue-400';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'text-red-500 dark:text-red-400';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'text-purple-500 dark:text-purple-400';
    case 'zip':
    case 'rar':
    case '7z':
      return 'text-amber-500 dark:text-amber-400';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return 'text-blue-500 dark:text-indigo-400';
    default:
      return 'text-[#616f89] dark:text-text-muted';
  }
};

export const FileList: React.FC<FileListProps> = ({
  files,
  onNavigate,
  onRefresh,
  onError,
}) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) {
      return;
    }

    try {
      await deleteFile(path);
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      onError(errorMessage);
    }
  };

  const handleShare = async (file: FileInfo) => {
    try {
      // Generate share URL
      const baseUrl = window.location.origin;
      let shareUrl: string;
      
      if (file.is_dir) {
        // For directories, share the list URL
        shareUrl = `${baseUrl}?path=${encodeURIComponent(file.path)}`;
      } else {
        // For files, share the download URL
        shareUrl = `${baseUrl}${getDownloadUrl(file.path)}`;
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      // Show success feedback
      setCopiedPath(file.path);
      setTimeout(() => {
        setCopiedPath(null);
      }, 2000);
    } catch (error) {
      console.error('Share error:', error);
      onError('复制链接失败，请手动复制');
    }
  };

  if (files.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a2130] rounded-xl border border-[#f0f2f4] dark:border-[#2d3748] p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-[#616f89] mb-2">
          folder_open
        </span>
        <p className="text-[#616f89] dark:text-text-muted">目录为空</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a2130] rounded-xl border border-[#f0f2f4] dark:border-[#2d3748] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#f0f2f4] dark:border-[#2d3748] text-xs font-bold text-[#616f89] dark:text-text-muted uppercase tracking-wider bg-white/5">
        <div className="col-span-5 flex items-center gap-2">
          <input
            className="rounded text-primary focus:ring-primary border-[#d1d5db] dark:bg-dark-main dark:border-dark-border"
            type="checkbox"
          />
          Name
        </div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Last Modified</div>
        <div className="col-span-2 text-right px-4">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-[#f0f2f4] dark:divide-dark-border">
        {files.map((file) => (
          <div
            key={file.path}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors items-center list-row cursor-pointer"
            onClick={() => {
              if (file.is_dir) {
                onNavigate(file.path);
              }
            }}
          >
            <div className="col-span-5 flex items-center gap-4">
              <input
                className="rounded text-primary focus:ring-primary border-[#d1d5db] dark:bg-dark-main dark:border-dark-border"
                type="checkbox"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined ${getFileIconColor(
                    file.name,
                    file.is_dir
                  )}`}
                >
                  {getFileIcon(file.name, file.is_dir)}
                </span>
                <span className="text-sm font-semibold text-[#111318] dark:text-white truncate">
                  {file.name}
                </span>
              </div>
            </div>
            <div className="col-span-2 text-sm text-[#616f89] dark:text-text-muted">
              {file.is_dir ? '-' : formatSize(file.size)}
            </div>
            <div className="col-span-3 text-sm text-[#616f89] dark:text-text-muted">
              {file.mod_time}
            </div>
            <div
              className="col-span-2 flex justify-end items-center gap-3 px-4 row-actions"
              onClick={(e) => e.stopPropagation()}
            >
              {file.is_dir ? (
                <button
                  className="text-[#616f89] dark:text-text-muted hover:text-primary transition-colors"
                  title="Download ZIP"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const url = getZipUrl(file.path);
                      const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                          'Accept': '*/*',
                        },
                      });
                      
                      if (!response.ok) {
                        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
                      }
                      
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = `${file.name}.zip`;
                      link.style.display = 'none';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                      console.error('Download ZIP error:', error);
                      const errorMessage = error instanceof Error ? error.message : '下载失败';
                      onError(errorMessage);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-xl">folder_zip</span>
                </button>
              ) : (
                <button
                  className="text-[#616f89] dark:text-text-muted hover:text-primary transition-colors"
                  title="Download"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const url = getDownloadUrl(file.path);
                      // Use fetch to download the file
                      const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                          'Accept': '*/*',
                        },
                      });
                      
                      if (!response.ok) {
                        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
                      }
                      
                      // Get the blob from response
                      const blob = await response.blob();
                      
                      // Create a temporary URL for the blob
                      const blobUrl = window.URL.createObjectURL(blob);
                      
                      // Create a temporary link element
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = file.name;
                      link.style.display = 'none';
                      
                      // Append to body, click, and remove
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      // Clean up the blob URL
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                      console.error('Download error:', error);
                      const errorMessage = error instanceof Error ? error.message : '下载失败';
                      onError(errorMessage);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-xl">download</span>
                </button>
              )}
              <button
                className={`text-[#616f89] dark:text-text-muted hover:text-primary transition-colors ${
                  copiedPath === file.path ? 'text-primary' : ''
                }`}
                title={copiedPath === file.path ? '已复制' : '分享'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(file);
                }}
              >
                <span className="material-symbols-outlined text-xl">
                  {copiedPath === file.path ? 'check_circle' : 'share'}
                </span>
              </button>
              <button
                className="text-[#616f89] dark:text-text-muted hover:text-red-500 transition-colors"
                title="Delete"
                onClick={() => handleDelete(file.path, file.name)}
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
