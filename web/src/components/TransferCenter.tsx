import React from 'react';
import { formatSize } from '../utils/format';
import type { TransferTask } from '../types';

interface TransferCenterProps {
  tasks: TransferTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearCompleted: () => void;
}

export const TransferCenter: React.FC<TransferCenterProps> = ({
  tasks,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearCompleted,
}) => {
  const activeCount = tasks.filter(
    (t) => t.status === 'active' || t.status === 'pending'
  ).length;

  // Calculate total speed from active tasks
  const totalSpeed = tasks
    .filter((t) => t.status === 'active' && t.speed)
    .reduce((sum, t) => sum + (t.speed || 0), 0);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const getStatusIcon = (task: TransferTask) => {
    if (task.status === 'error') {
      return '⚠️';
    }
    if (task.status === 'completed') {
      return '✅';
    }
    if (task.type === 'upload') {
      return '📤';
    }
    return '📥';
  };

  const getStatusColor = (task: TransferTask) => {
    if (task.status === 'error') {
      return 'error';
    }
    if (task.status === 'completed') {
      return 'success';
    }
    return 'primary';
  };

  const formatTimeLeft = (seconds?: number) => {
    if (!seconds || seconds < 0) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Always show Transfer Center, even when empty
  return (
    <div className="transfer-center" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="transfer-center-header">
        <h2>Transfer Center</h2>
        {tasks.length === 0 ? (
          <span className="transfer-badge">0 Active</span>
        ) : activeCount > 0 ? (
          <span className="transfer-badge">{activeCount} Active</span>
        ) : (
          <span className="transfer-badge">0 Active</span>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="transfer-center-content">
          <div className="transfer-center-empty">
            <p>暂无传输任务</p>
          </div>
        </div>
      ) : (
        <>
          <div className="transfer-center-content">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`transfer-task transfer-task-${getStatusColor(task)}`}
              >
                <div className="transfer-task-header">
                  <div className="transfer-task-icon">{getStatusIcon(task)}</div>
                  <div className="transfer-task-info">
                    <p className="transfer-task-name" title={task.name}>
                      {task.name}
                    </p>
                    <p className="transfer-task-meta">
                      {task.status === 'error' && task.error
                        ? `中断 • ${formatSize(task.size)}`
                        : task.type === 'upload'
                        ? `直接上传 • ${formatSize(task.size)}`
                        : task.threadCount
                        ? `Thread: ${task.threadCount} • ${formatSize(task.size)}`
                        : `下载 • ${formatSize(task.size)}`}
                    </p>
                  </div>
                  <div className="transfer-task-actions">
                    {task.status === 'active' && (
                      <button
                        onClick={() => onPause(task.id)}
                        className="transfer-action-btn"
                        title="暂停"
                      >
                        ⏸️
                      </button>
                    )}
                    {task.status === 'paused' && (
                      <button
                        onClick={() => onResume(task.id)}
                        className="transfer-action-btn"
                        title="继续"
                      >
                        ▶️
                      </button>
                    )}
                    {task.status === 'error' && (
                      <button
                        onClick={() => onRetry(task.id)}
                        className="transfer-action-btn"
                        title="重试"
                      >
                        🔄
                      </button>
                    )}
                    {(task.status === 'completed' ||
                      task.status === 'error' ||
                      task.status === 'paused') && (
                      <button
                        onClick={() => onCancel(task.id)}
                        className="transfer-action-btn"
                        title="移除"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {task.status !== 'completed' && (
                  <>
                    <div className="transfer-progress-bar">
                      <div
                        className="transfer-progress-fill"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="transfer-progress-info">
                      {task.status === 'error' ? (
                        <p className="transfer-error-message">
                          暂停于 {task.progress}% ({task.error || '传输失败'})
                        </p>
                      ) : (
                        <>
                          <span className="transfer-speed">
                            {task.progress}%
                            {task.speed && ` • ${task.speed.toFixed(1)} MB/s`}
                          </span>
                          <span className="transfer-time">
                            {formatTimeLeft(task.estimatedTimeLeft)} left
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
                {task.status === 'completed' && (
                  <div className="transfer-completed">已完成</div>
                )}
              </div>
            ))}
          </div>
          {(totalSpeed > 0 || completedCount > 0) && (
            <div className="transfer-center-footer">
              {totalSpeed > 0 && (
                <div className="transfer-total-speed">
                  总速度: {totalSpeed.toFixed(1)} MB/s
                </div>
              )}
              {completedCount > 0 && (
                <button
                  onClick={onClearCompleted}
                  className="transfer-clear-btn"
                >
                  清除已完成
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="transfer-center">
      <div className="transfer-center-header">
        <h2>Transfer Center</h2>
        {activeCount > 0 ? (
          <span className="transfer-badge">{activeCount} Active</span>
        ) : (
          <span className="transfer-badge">0 Active</span>
        )}
      </div>
      <div className="transfer-center-content">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`transfer-task transfer-task-${getStatusColor(task)}`}
          >
            <div className="transfer-task-header">
              <div className="transfer-task-icon">{getStatusIcon(task)}</div>
              <div className="transfer-task-info">
                <p className="transfer-task-name" title={task.name}>
                  {task.name}
                </p>
                <p className="transfer-task-meta">
                  {task.status === 'error' && task.error
                    ? `中断 • ${formatSize(task.size)}`
                    : task.type === 'upload'
                      ? `直接上传 • ${formatSize(task.size)}`
                      : task.threadCount
                        ? `Thread: ${task.threadCount} • ${formatSize(task.size)}`
                        : `下载 • ${formatSize(task.size)}`}
                </p>
              </div>
              <div className="transfer-task-actions">
                {task.status === 'active' && (
                  <button
                    onClick={() => onPause(task.id)}
                    className="transfer-action-btn"
                    title="暂停"
                  >
                    ⏸️
                  </button>
                )}
                {task.status === 'paused' && (
                  <button
                    onClick={() => onResume(task.id)}
                    className="transfer-action-btn"
                    title="继续"
                  >
                    ▶️
                  </button>
                )}
                {task.status === 'error' && (
                  <button
                    onClick={() => onRetry(task.id)}
                    className="transfer-action-btn"
                    title="重试"
                  >
                    🔄
                  </button>
                )}
                {(task.status === 'completed' ||
                  task.status === 'error' ||
                  task.status === 'paused') && (
                    <button
                      onClick={() => onCancel(task.id)}
                      className="transfer-action-btn"
                      title="移除"
                    >
                      ✕
                    </button>
                  )}
              </div>
            </div>
            {task.status !== 'completed' && (
              <>
                <div className="transfer-progress-bar">
                  <div
                    className="transfer-progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="transfer-progress-info">
                  {task.status === 'error' ? (
                    <p className="transfer-error-message">
                      暂停于 {task.progress}% ({task.error || '传输失败'})
                    </p>
                  ) : (
                    <>
                      <span className="transfer-speed">
                        {task.progress}%
                        {task.speed && ` • ${task.speed.toFixed(1)} MB/s`}
                      </span>
                      <span className="transfer-time">
                        {formatTimeLeft(task.estimatedTimeLeft)} left
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
            {task.status === 'completed' && (
              <div className="transfer-completed">已完成</div>
            )}
          </div>
        ))}
      </div>
      {(totalSpeed > 0 || completedCount > 0) && (
        <div className="transfer-center-footer">
          {totalSpeed > 0 && (
            <div className="transfer-total-speed">
              总速度: {totalSpeed.toFixed(1)} MB/s
            </div>
          )}
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="transfer-clear-btn"
            >
              清除已完成
            </button>
          )}
        </div>
      )}
    </div>
  );
};
