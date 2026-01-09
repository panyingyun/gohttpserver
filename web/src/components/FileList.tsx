import React from 'react';
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
                <>
                  <a
                    href={getZipUrl(file.path)}
                    download={`${file.name}.zip`}
                    className="text-[#616f89] dark:text-text-muted hover:text-primary transition-colors"
                    title="Download ZIP"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-xl">folder_zip</span>
                  </a>
                </>
              ) : (
                <a
                  href={getDownloadUrl(file.path)}
                  download={file.name}
                  className="text-[#616f89] dark:text-text-muted hover:text-primary transition-colors"
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-xl">download</span>
                </a>
              )}
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
