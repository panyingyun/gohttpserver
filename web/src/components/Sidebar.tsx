import React, { useState, useRef } from 'react';
import { uploadFiles } from '../services/api';

interface SidebarProps {
  currentPath: string;
  onUploadSuccess: () => void;
  onError: (error: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onUploadSuccess,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await handleUpload(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await handleUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (files: File[]) => {
    try {
      await uploadFiles(files, currentPath);
      onUploadSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      onError(errorMessage);
    }
  };

  return (
    <aside className="w-72 bg-white dark:bg-[#1a2130] border-r border-[#f0f2f4] dark:border-[#2d3748] flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">cloud_done</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[#111318] dark:text-white text-base font-bold leading-tight">
              StaticFile Pro
            </h1>
            <p className="text-[#616f89] text-xs font-normal">Standard Account</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <a
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium"
            href="#"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-sm">Home</span>
          </a>
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-background-light/50 dark:bg-white/5 transition-all ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-[#d1d5db] dark:border-[#4a5568]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            upload_file
          </span>
          <p className="text-sm font-medium text-[#111318] dark:text-white mb-1">
            Upload Files
          </p>
          <p className="text-xs text-[#616f89]">
            Drag and drop files here to upload instantly
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            className="mt-4 w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </button>
        </div>
      </div>
    </aside>
  );
};
