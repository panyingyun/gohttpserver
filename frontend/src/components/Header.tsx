import React, { useState, useEffect } from 'react';
import { searchFiles } from '../services/api';
import type { SearchResult } from '../types';

interface HeaderProps {
  path: string;
  onNavigate: (path: string) => void;
  onSearchResults: (results: SearchResult[]) => void;
  onClearSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  path,
  onNavigate,
  onSearchResults,
  onClearSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      onClearSearch();
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await searchFiles(searchQuery);
        onSearchResults(response.results);
      } catch (error) {
        console.error('Search error:', error);
        onSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearchResults, onClearSearch]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const pathParts = path.split('/').filter(p => p);
  const segments: string[] = ['/'];

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-[#1a2130] border-b border-[#f0f2f4] dark:border-[#2d3748] shrink-0">
      <div className="flex items-center gap-6">
        {/* Logo and Product Name */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-[#111318] dark:text-white text-base font-bold leading-tight">
            GHS Pro
          </h1>
        </div>

        {/* Path Navigation */}
        <div className="flex items-center gap-2">
          <a
            className="text-[#616f89] text-sm font-medium hover:text-primary"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
          >
            Root
          </a>
          {pathParts.map((part, index) => {
            segments.push(part);
            const segmentPath = segments.join('/');
            return (
              <React.Fragment key={index}>
                <span className="text-[#616f89] text-sm">/</span>
                <a
                  className="text-[#616f89] text-sm font-medium hover:text-primary"
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
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="flex items-center bg-background-light dark:bg-white/10 rounded-lg px-3 py-1.5 transition-all w-64 focus-within:ring-2 focus-within:ring-primary">
            <span className="material-symbols-outlined text-[#616f89] text-xl">
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-[#616f89] py-1"
              placeholder="Search files, folders..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <button
          className="size-10 flex items-center justify-center bg-background-light dark:bg-white/10 rounded-lg text-[#111318] dark:text-white hover:bg-white/10 transition-colors"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          <span className="material-symbols-outlined">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  );
};
