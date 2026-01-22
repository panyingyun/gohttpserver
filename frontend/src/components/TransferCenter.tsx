import React from 'react';

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

interface TransferCenterProps {
  transfers: Transfer[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onClear: () => void;
}

export const TransferCenter: React.FC<TransferCenterProps> = ({
  transfers,
  onPause,
  onResume,
  onClear,
}) => {
  const activeCount = transfers.filter(t => t.status === 'active').length;

  const getStatusIcon = (transfer: Transfer): string => {
    switch (transfer.status) {
      case 'active':
        return transfer.type === 'download' ? 'downloading' : 'upload';
      case 'paused':
      case 'error':
        return 'error_outline';
      case 'completed':
        return 'check_circle';
      default:
        return 'schedule';
    }
  };

  const getStatusColor = (transfer: Transfer): string => {
    switch (transfer.status) {
      case 'active':
        return 'bg-primary/20 text-primary dark:text-blue-400';
      case 'paused':
      case 'error':
        return 'bg-amber-500/10 text-amber-500';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400';
      default:
        return 'bg-white/5 text-text-muted';
    }
  };

  const getProgressColor = (transfer: Transfer): string => {
    switch (transfer.status) {
      case 'active':
        return 'bg-primary';
      case 'paused':
      case 'error':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <aside className="w-80 bg-white dark:bg-[#1a2130] border-l border-[#f0f2f4] dark:border-[#2d3748] flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center justify-between border-b border-[#f0f2f4] dark:border-[#2d3748]">
        <h2 className="text-lg font-bold text-[#111318] dark:text-white">
          Transfer Center
        </h2>
        {activeCount > 0 && (
          <span className="text-xs font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-blue-400/10 px-2 py-0.5 rounded-full">
            {activeCount} Active
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-[#616f89] dark:text-text-muted text-sm">
            <span className="material-symbols-outlined text-4xl mb-2 block">
              cloud_done
            </span>
            <p>No active transfers</p>
          </div>
        ) : (
          transfers.map((transfer) => (
            <div
              key={transfer.id}
              className={`p-3 dark:p-4 rounded-xl border ${
                transfer.status === 'paused' || transfer.status === 'error'
                  ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/20 dark:border-amber-500/10'
                  : transfer.status === 'completed'
                  ? 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/10'
                  : 'bg-background-light dark:bg-white/5 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 mb-2 dark:mb-3">
                <div
                  className={`size-8 dark:size-9 rounded-lg flex items-center justify-center ${getStatusColor(
                    transfer
                  )}`}
                >
                  <span className="material-symbols-outlined text-xl dark:text-lg">
                    {getStatusIcon(transfer)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#111318] dark:text-white truncate">
                    {transfer.name}
                  </p>
                  <p className="text-[10px] text-[#616f89] dark:text-text-muted">
                    {transfer.status === 'error'
                      ? `Interrupted • ${transfer.size || ''}`
                      : transfer.status === 'completed'
                      ? `Direct ${transfer.type === 'download' ? 'Download' : 'Upload'} • ${transfer.size || ''}`
                      : `Thread: 8 • ${transfer.size || ''}`}
                  </p>
                </div>
                {transfer.status === 'active' && (
                  <button
                    className="text-[#616f89] dark:text-text-muted hover:text-white"
                    onClick={() => onPause(transfer.id)}
                  >
                    <span className="material-symbols-outlined text-sm dark:text-lg">
                      pause_circle
                    </span>
                  </button>
                )}
                {(transfer.status === 'paused' || transfer.status === 'error') && (
                  <button
                    className="text-primary dark:text-amber-500 hover:bg-primary/10 dark:hover:bg-amber-500/10 rounded-full p-1 transition-colors"
                    onClick={() => onResume(transfer.id)}
                  >
                    <span className="material-symbols-outlined text-sm dark:text-lg">
                      replay
                    </span>
                  </button>
                )}
              </div>

              <div className="w-full h-1.5 bg-[#e2e8f0] dark:bg-dark-main rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(transfer)}`}
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>

              {transfer.status === 'active' && (
                <div className="flex items-center justify-between mt-1.5 dark:mt-2">
                  <p className="text-[10px] text-primary dark:text-blue-400 font-bold">
                    {transfer.progress}% • {transfer.speed || '0 MB/s'}
                  </p>
                  {transfer.timeLeft && (
                    <p className="text-[10px] text-[#616f89] dark:text-text-muted">
                      {transfer.timeLeft} left
                    </p>
                  )}
                </div>
              )}

              {transfer.status === 'paused' && (
                <p className="text-[10px] text-[#616f89] dark:text-text-muted mt-1.5 dark:mt-2">
                  Paused at {transfer.progress}% (Server Timeout)
                </p>
              )}

              {transfer.status === 'error' && (
                <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1.5 dark:mt-2">
                  Interrupted at {transfer.progress}% (Server Timeout)
                </p>
              )}

              {transfer.status === 'completed' && (
                <div className="flex items-center justify-between mt-1.5 dark:mt-2">
                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">
                    Completed
                  </p>
                  <span className="material-symbols-outlined text-[10px] text-emerald-500 dark:text-emerald-400">
                    task_alt
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {transfers.length > 0 && (
        <div className="p-4 dark:p-6 bg-[#f8fafc] dark:bg-white/5 border-t border-[#f0f2f4] dark:border-[#2d3748]">
          <div className="flex items-center justify-between text-xs mb-2 dark:mb-4">
            <span className="text-[#616f89] dark:text-text-muted">Total Speed</span>
            <span className="text-[#111318] dark:text-white font-bold">14.8 MB/s</span>
          </div>
          <button
            className="w-full py-2 dark:py-2.5 bg-white dark:bg-dark-main border border-[#f0f2f4] dark:border-dark-border rounded-lg text-xs font-bold text-[#616f89] dark:text-text-muted hover:bg-primary/5 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white transition-all"
            onClick={onClear}
          >
            Clear Completed
          </button>
        </div>
      )}
    </aside>
  );
};
