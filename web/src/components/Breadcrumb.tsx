import React from 'react';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  const parts = path.split('/').filter(p => p);
  const segments: string[] = ['/'];

  return (
    <nav className="breadcrumb">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('/');
        }}
      >
        首页
      </a>
      {parts.map((part, index) => {
        segments.push(part);
        const segmentPath = segments.join('/');
        return (
          <React.Fragment key={index}>
            <span> / </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(segmentPath);
              }}
            >
              {part}
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
