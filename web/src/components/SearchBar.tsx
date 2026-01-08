import React, { useState, useEffect } from 'react';
import { searchFiles } from '../services/api';
import type { SearchResult } from '../types';

interface SearchBarProps {
  onSearchResults: (results: SearchResult[]) => void;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, onClear }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      onClear();
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchFiles(query);
        onSearchResults(response.results);
      } catch (error) {
        console.error('Search error:', error);
        onSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearchResults, onClear]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      // Trigger immediate search on Enter
    }
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="搜索文件..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        className="search-input"
      />
      {isSearching && <span className="search-loading">搜索中...</span>}
    </div>
  );
};
