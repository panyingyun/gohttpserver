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

export const FileList: React.FC<FileListProps> = ({
  files,
  onNavigate,
  onRefresh,
  onError,
}) => {
  // Ensure files is always an array
  const fileList = Array.isArray(files) ? files : [];
  
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

  if (fileList.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📁</div>
          <div style={{ fontSize: '16px', color: '#666' }}>目录为空</div>
          <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
            拖拽文件到上方区域上传，或点击"选择文件"按钮
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>大小</th>
            <th>修改时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {fileList.map((file) => (
            <tr key={file.path}>
              <td>
                <span className="file-icon">{file.is_dir ? '📁' : '📄'}</span>
                {file.is_dir ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(file.path);
                    }}
                    className="file-name"
                  >
                    {file.name}
                  </a>
                ) : (
                  <span className="file-name">{file.name}</span>
                )}
              </td>
              <td>{file.is_dir ? '-' : formatSize(file.size)}</td>
              <td>{file.mod_time}</td>
              <td>
                <div className="file-actions">
                  {file.is_dir ? (
                    <>
                      <button
                        onClick={() => onNavigate(file.path)}
                        className="btn-link"
                      >
                        打开
                      </button>
                      <a
                        href={getZipUrl(file.path)}
                        download={`${file.name}.zip`}
                        className="btn-link"
                      >
                        下载ZIP
                      </a>
                    </>
                  ) : (
                    <a
                      href={getDownloadUrl(file.path)}
                      download={file.name}
                      className="btn-link"
                    >
                      下载
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(file.path, file.name)}
                    className="btn-link btn-danger"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
