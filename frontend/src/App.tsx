import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listFiles, uploadFilesWithProgress } from './services/api';
import { Header } from './components/Header';
import { FileList } from './components/FileList';
import { TransferCenter } from './components/TransferCenter';
import { formatSize } from './utils/format';
import type { FileInfo, SearchResult } from './types';

const STORAGE_KEY_PATH = 'ghs-current-path';

function normalizePath(p: string): string {
  const path = p.trim() || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParam = urlParams.get('path');
    if (pathParam != null && pathParam !== '') return normalizePath(pathParam);
    const saved = localStorage.getItem(STORAGE_KEY_PATH);
    if (saved != null && saved !== '') return normalizePath(saved);
  } catch {
    // ignore
  }
  return '/';
}

function savePathToStorage(path: string) {
  try {
    localStorage.setItem(STORAGE_KEY_PATH, path);
  } catch {
    // ignore localStorage errors
  }
}

function updatePathInUrl(path: string) {
  const url = new URL(window.location.href);
  if (path === '/' || path === '') {
    url.searchParams.delete('path');
  } else {
    url.searchParams.set('path', path);
  }
  window.history.replaceState({ path }, '', url.toString());
}

interface Transfer {
  id: string;
  name: string;
  type: 'download' | 'upload';
  status: 'active' | 'paused' | 'completed' | 'error';
  progress: number;
  speed?: string;
  size?: string;
  timeLeft?: string;
}

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(getInitialPath);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const loadFiles = useCallback(async (path: string = currentPath) => {
    const normalizedPath = normalizePath(path);
    setIsLoading(true);
    setError(null);

    try {
      const response = await listFiles(normalizedPath);
      // Ensure files is always an array
      setFiles(Array.isArray(response.files) ? response.files : []);
      const resolvedPath = response.path || normalizedPath;
      setCurrentPath(resolvedPath);
      savePathToStorage(resolvedPath);
      updatePathInUrl(resolvedPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败';
      setError(errorMessage);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    const initialPath = getInitialPath();
    updatePathInUrl(initialPath);
    loadFiles(initialPath);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    loadFiles(path);
  }, [loadFiles]);

  const handleSearchResults = useCallback((results: SearchResult[]) => {
    // Convert search results to FileInfo format
    const fileInfos: FileInfo[] = results.map((r) => ({
      name: r.path.split('/').pop() || r.path,
      path: r.path,
      is_dir: r.is_dir,
      size: r.size,
      mod_time: r.mod_time,
    }));
    setFiles(fileInfos);
  }, []);

  const handleSearchClear = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Track upload progress for each file
  const uploadProgressRef = useRef<Map<string, { loaded: number; total: number; lastTime: number; lastLoaded: number }>>(new Map());

  const handleUploadProgress = useCallback((fileId: string, _file: File, progress: number, loaded: number, total: number) => {
    const now = Date.now();
    const progressData = uploadProgressRef.current.get(fileId);
    
    let speed = '0 MB/s';
    let timeLeft: string | undefined;

    if (progressData) {
      const timeDiff = (now - progressData.lastTime) / 1000; // seconds
      const loadedDiff = loaded - progressData.lastLoaded;
      
      if (timeDiff > 0) {
        const bytesPerSecond = loadedDiff / timeDiff;
        const mbPerSecond = bytesPerSecond / (1024 * 1024);
        speed = `${mbPerSecond.toFixed(2)} MB/s`;
        
        if (bytesPerSecond > 0) {
          const remaining = total - loaded;
          const secondsLeft = remaining / bytesPerSecond;
          if (secondsLeft < 60) {
            timeLeft = `${Math.round(secondsLeft)}s`;
          } else if (secondsLeft < 3600) {
            timeLeft = `${Math.round(secondsLeft / 60)}m`;
          } else {
            timeLeft = `${Math.round(secondsLeft / 3600)}h`;
          }
        }
      }
    }

    uploadProgressRef.current.set(fileId, {
      loaded,
      total,
      lastTime: now,
      lastLoaded: loaded,
    });

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === fileId
          ? {
              ...t,
              progress,
              speed,
              timeLeft,
              size: formatSize(total),
            }
          : t
      )
    );
  }, []);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Create transfer tasks for each file
    const newTransfers: Transfer[] = files.map((file, index) => {
      const fileId = `upload-${Date.now()}-${index}`;
      return {
        id: fileId,
        name: file.name,
        type: 'upload',
        status: 'active',
        progress: 0,
        size: formatSize(file.size),
      };
    });

    setTransfers((prev) => [...prev, ...newTransfers]);

    // Upload files individually to handle errors per file
    const uploadPromises = files.map(async (file, index) => {
      const fileId = newTransfers[index].id;
      try {
        await uploadFilesWithProgress(
          [file],
          currentPath,
          (fileIndex, progress, loaded, total) => {
            if (fileIndex === 0) {
              handleUploadProgress(fileId, file, progress, loaded, total);
            }
          }
        );

        // Mark as completed
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? { ...t, status: 'completed' as const, progress: 100 }
              : t
          )
        );

        // Clean up progress tracking
        uploadProgressRef.current.delete(fileId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '上传失败';
        
        // Mark as error with specific error message
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? { ...t, status: 'error' as const }
              : t
          )
        );

        // Clean up progress tracking
        uploadProgressRef.current.delete(fileId);

        // Only show error notification for timeout errors
        if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
          handleError(`文件 "${file.name}" 上传超时，请重试`);
        }
      }
    });

    try {
      await Promise.all(uploadPromises);
      // Refresh file list after uploads complete
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        loadFiles();
      }, 500);
    } catch (error) {
      // Individual errors are already handled above
      // Still refresh in case some files succeeded
      setTimeout(() => {
        loadFiles();
      }, 500);
    }
  }, [currentPath, loadFiles, handleUploadProgress, handleError]);


  const handlePause = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'paused' as const } : t
      )
    );
  };

  const handleResume = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'active' as const } : t
      )
    );
  };

  const handleClearTransfers = () => {
    setTransfers((prev) => prev.filter((t) => t.status !== 'completed'));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white">
      <main className="flex-1 flex flex-col h-full bg-background-light dark:bg-background-dark relative overflow-hidden">
        <Header
          path={currentPath}
          onNavigate={handleNavigate}
          onSearchResults={handleSearchResults}
          onClearSearch={handleSearchClear}
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#111318] dark:text-white">
              Files & Folders
            </h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1a2130] border border-[#f0f2f4] dark:border-[#2d3748] rounded-lg text-sm font-medium text-[#616f89] dark:text-text-muted hover:text-primary dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1a2130] border border-[#f0f2f4] dark:border-[#2d3748] rounded-lg text-sm font-medium text-[#616f89] dark:text-text-muted hover:text-primary dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">list</span>
                List
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="bg-white dark:bg-[#1a2130] rounded-xl border border-[#f0f2f4] dark:border-[#2d3748] p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-[#616f89] mb-2 animate-spin">
                refresh
              </span>
              <p className="text-[#616f89] dark:text-text-muted">加载中...</p>
            </div>
          ) : (
            <FileList
              files={files}
              onNavigate={handleNavigate}
              onRefresh={() => loadFiles()}
              onError={handleError}
            />
          )}
        </div>

        <button
          className="absolute bottom-8 right-8 size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 shadow-primary/30"
          onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              if (files.length > 0) {
                await handleUploadFiles(files);
              }
            };
            input.click();
          }}
          title="Upload files"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </main>

      <TransferCenter
        transfers={transfers}
        onPause={handlePause}
        onResume={handleResume}
        onClear={handleClearTransfers}
      />
    </div>
  );
};

export default App;
