import React, { useState, useEffect, useCallback } from 'react';
import { listFiles, uploadFiles } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileList } from './components/FileList';
import { TransferCenter } from './components/TransferCenter';
import { formatSize } from './utils/format';
import type { FileInfo, SearchResult } from './types';

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
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const loadFiles = useCallback(async (path: string = currentPath) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listFiles(path);
      setFiles(response.files);
      setCurrentPath(response.path);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败';
      setError(errorMessage);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    // Check if there's a path parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const pathParam = urlParams.get('path');
    if (pathParam) {
      loadFiles(pathParam);
    } else {
      loadFiles();
    }
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

  const handleUploadSuccess = useCallback((uploadedFiles?: File[]) => {
    loadFiles();
    // Add upload transfer with actual file information
    if (uploadedFiles && uploadedFiles.length > 0) {
      const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
      const newTransfer: Transfer = {
        id: Date.now().toString(),
        name: uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} files`,
        type: 'upload',
        status: 'completed',
        progress: 100,
        size: formatSize(totalSize),
      };
      setTransfers((prev) => [...prev, newTransfer]);
    } else {
      // Fallback for drag & drop or other upload methods
      const newTransfer: Transfer = {
        id: Date.now().toString(),
        name: 'Uploaded files',
        type: 'upload',
        status: 'completed',
        progress: 100,
        size: '0 KB',
      };
      setTransfers((prev) => [...prev, newTransfer]);
    }
  }, [loadFiles]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }, []);

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
      <Sidebar
        currentPath={currentPath}
        onUploadSuccess={handleUploadSuccess}
        onError={handleError}
      />

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
                try {
                  await uploadFiles(files, currentPath);
                  handleUploadSuccess(files);
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : '上传失败';
                  handleError(errorMessage);
                }
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
