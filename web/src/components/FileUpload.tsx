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
    // Generate unique task IDs for each file
    let taskIndex = 0;
    const uploadPromises = files.map((file) => {
      return new Promise<void>((resolve, reject) => {
        // Use index and timestamp to ensure unique IDs
        const taskId = `upload-${Date.now()}-${taskIndex++}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        const task: TransferTask = {
          id: taskId,
          name: file.name,
          type: 'upload',
          status: 'pending',
          progress: 0,
          size: file.size,
          startTime: startTime,
        };

        onTaskAdd(task);

        const formData = new FormData();
        formData.append('path', currentPath);
        formData.append('files', file);

        const xhr = new XMLHttpRequest();
        
        // Browser will automatically include Basic Auth credentials if user has logged in
        // We don't need to manually set Authorization header as browser handles it
        // XMLHttpRequest will use the same credentials as fetch requests

        // Set status to active immediately when upload starts
        xhr.addEventListener('loadstart', () => {
          onTaskUpdate(taskId, {
            status: 'active',
            progress: 0,
          });
        });

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const progress = Math.round((e.loaded / e.total) * 100);
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0 && e.loaded > 0) {
              const speed = e.loaded / elapsed / 1024 / 1024; // MB/s
              const remaining = e.total > e.loaded ? ((e.total - e.loaded) / (e.loaded / elapsed)) / 1000 : 0;

              onTaskUpdate(taskId, {
                status: 'active',
                progress,
                speed: speed > 0 ? speed : undefined,
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
            resolve();
          } else {
            let errorMessage = `上传失败: HTTP ${xhr.status}`;
            if (xhr.status === 401) {
              errorMessage = '需要认证，请刷新页面并输入用户名和密码';
            } else if (xhr.status === 403) {
              errorMessage = '访问被拒绝';
            } else if (xhr.status === 405) {
              errorMessage = '上传功能未启用，请使用 --upload 参数启动服务器';
            } else {
              try {
                const responseText = xhr.responseText;
                if (responseText) {
                  errorMessage = `上传失败: ${responseText.substring(0, 100)}`;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
            onTaskUpdate(taskId, {
              status: 'error',
              error: errorMessage,
            });
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          const errorMessage = '上传失败: 网络错误，请检查网络连接';
          onTaskUpdate(taskId, {
            status: 'error',
            error: errorMessage,
          });
          reject(new Error(errorMessage));
        });
        
        xhr.addEventListener('timeout', () => {
          const errorMessage = '上传失败: 请求超时';
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
        xhr.timeout = 300000; // 5 minutes timeout
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
