import React, { useState, useEffect, useCallback } from 'react';
import { listFiles } from './services/api';
import { Breadcrumb } from './components/Breadcrumb';
import { FileList } from './components/FileList';
import { FileUpload } from './components/FileUpload';
import { SearchBar } from './components/SearchBar';
import { TransferCenter } from './components/TransferCenter';
import type { FileInfo, SearchResult, TransferTask } from './types';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);

  const loadFiles = useCallback(async (path: string = currentPath) => {
    setIsLoading(true);
    setError(null);
    setIsSearchMode(false);

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
    loadFiles();
  }, []);

  const handleNavigate = useCallback((path: string) => {
    loadFiles(path);
  }, [loadFiles]);

  const handleSearchResults = useCallback((results: SearchResult[]) => {
    setIsSearchMode(true);
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
    setIsSearchMode(false);
    loadFiles();
  }, [loadFiles]);

  const handleUploadSuccess = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Transfer Center handlers
  const addTransferTask = useCallback((task: TransferTask) => {
    setTransferTasks((prev) => [...prev, task]);
  }, []);

  const updateTransferTask = useCallback(
    (id: string, updates: Partial<TransferTask>) => {
      setTransferTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
      );
    },
    []
  );

  const handlePause = useCallback((id: string) => {
    updateTransferTask(id, { status: 'paused' });
  }, [updateTransferTask]);

  const handleResume = useCallback((id: string) => {
    updateTransferTask(id, { status: 'active' });
  }, [updateTransferTask]);

  const handleCancel = useCallback((id: string) => {
    setTransferTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const handleRetry = useCallback((id: string) => {
    updateTransferTask(id, { status: 'pending', error: undefined });
  }, [updateTransferTask]);

  const handleClearCompleted = useCallback(() => {
    setTransferTasks((prev) =>
      prev.filter((task) => task.status !== 'completed')
    );
  }, []);

  return (
    <div className="app">
      <header>
        <h1>📁 文件服务器</h1>
      </header>

      <div className="app-layout">
        <div className="main-content">
          <div className="container">
            {!isSearchMode && (
              <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
            )}

            <div className="toolbar">
              <SearchBar
                onSearchResults={handleSearchResults}
                onClear={handleSearchClear}
              />
              {!isSearchMode && (
                <button onClick={() => loadFiles()} className="btn-refresh">
                  刷新
                </button>
              )}
            </div>

            {!isSearchMode && (
              <FileUpload
                currentPath={currentPath}
                onUploadSuccess={handleUploadSuccess}
                onError={handleError}
                onTaskAdd={addTransferTask}
                onTaskUpdate={updateTransferTask}
              />
            )}

            {error && <div className="error-message">{error}</div>}

            {isLoading ? (
              <div className="loading">加载中...</div>
            ) : (
              <FileList
                files={files}
                onNavigate={handleNavigate}
                onRefresh={() => loadFiles()}
                onError={handleError}
              />
            )}
          </div>
        </div>

        <aside className="transfer-sidebar">
          <TransferCenter
            tasks={transferTasks}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
            onRetry={handleRetry}
            onClearCompleted={handleClearCompleted}
          />
        </aside>
      </div>
    </div>
  );
};

export default App;
