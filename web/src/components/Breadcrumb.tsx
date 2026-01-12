import React from 'react';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  const parts = path.split('/').filter(Boolean);
  const paths = parts.map((_, index) => {
    return '/' + parts.slice(0, index + 1).join('/');
  });

  return (
    <div className="breadcrumb">
      <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/'); }}>
        根目录
      </a>
      {paths.map((p, index) => (
        <React.Fragment key={p}>
          <span> / </span>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(p); }}>
            {parts[index]}
          </a>
        </React.Fragment>
      ))}
    </div>
  );
};
