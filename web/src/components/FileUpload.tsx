import React, { useState, useCallback } from 'react';
import { uploadFiles } from '../services/api';

interface FileUploadProps {
  currentPath: string;
  onUploadSuccess: () => void;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  currentPath,
  onUploadSuccess,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      await handleUpload(files);
    },
    [currentPath]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      await handleUpload(files);
      // Reset input
      e.target.value = '';
    },
    [currentPath]
  );

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadFiles(files, currentPath);
      setUploadProgress(100);
      onUploadSuccess();
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      onError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      className={`upload-area ${isDragging ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="fileInput"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <p>
        📤 拖拽文件到此处上传，或{' '}
        <button onClick={() => document.getElementById('fileInput')?.click()}>
          选择文件
        </button>
      </p>
      {isUploading && (
        <div className="upload-progress">
          <div
            className="upload-progress-bar"
            style={{ width: `${uploadProgress}%` }}
          />
          <span>上传中... {uploadProgress}%</span>
        </div>
      )}
    </div>
  );
};
