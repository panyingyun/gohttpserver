import React, { useState, useCallback } from 'react';
import type { TransferTask } from '../types';

interface FileUploadProps {
  currentPath: string;
  onUploadSuccess: () => void;
  onError: (error: string) => void;
  onTaskAdd: (task: TransferTask) => void;
  onTaskUpdate: (id: string, updates: Partial<TransferTask>) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  currentPath,
  onUploadSuccess,
  onError,
  onTaskAdd,
  onTaskUpdate,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = useCallback(async (files: File[]) => {
    const uploadPromises = files.map((file) => {
      return new Promise<void>((resolve, reject) => {
        const taskId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const task: TransferTask = {
          id: taskId,
          name: file.name,
          type: 'upload',
          status: 'pending',
          progress: 0,
          size: file.size,
          startTime: Date.now(),
        };

        onTaskAdd(task);

        const formData = new FormData();
        formData.append('path', currentPath);
        formData.append('files', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            const elapsed = (Date.now() - (task.startTime || 0)) / 1000;
            if (elapsed > 0) {
              const speed = e.loaded / elapsed / 1024 / 1024; // MB/s
              const remaining = ((e.total - e.loaded) / (e.loaded / elapsed)) / 1000;

              onTaskUpdate(taskId, {
                status: 'active',
                progress,
                speed,
                estimatedTimeLeft: remaining > 0 ? remaining : undefined,
              });
            } else {
              onTaskUpdate(taskId, {
                status: 'active',
                progress,
              });
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onTaskUpdate(taskId, {
              status: 'completed',
              progress: 100,
            });
            // Auto remove completed task after 3 seconds
            setTimeout(() => {
              onTaskUpdate(taskId, { status: 'completed' });
            }, 3000);
            resolve();
          } else {
            const errorMessage = `上传失败: HTTP ${xhr.status}`;
            onTaskUpdate(taskId, {
              status: 'error',
              error: errorMessage,
            });
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          const errorMessage = '上传失败: 网络错误';
          onTaskUpdate(taskId, {
            status: 'error',
            error: errorMessage,
          });
          reject(new Error(errorMessage));
        });

        xhr.addEventListener('abort', () => {
          onTaskUpdate(taskId, {
            status: 'paused',
          });
          reject(new Error('上传已取消'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    });

    try {
      await Promise.all(uploadPromises);
      onUploadSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      onError(errorMessage);
    }
  }, [currentPath, onTaskAdd, onTaskUpdate, onUploadSuccess, onError]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      await handleUpload(files);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      await handleUpload(files);
      // Reset input
      e.target.value = '';
    },
    [handleUpload]
  );

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
    </div>
  );
};
