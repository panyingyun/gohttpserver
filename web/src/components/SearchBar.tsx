import React, { useState, useCallback } from 'react';
import { searchFiles } from '../services/api';
import type { SearchResult } from '../types';

interface SearchBarProps {
  onSearchResults: (results: SearchResult[]) => void;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, onClear }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onClear();
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchFiles(searchQuery);
      onSearchResults(response.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [onSearchResults, onClear]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder="搜索文件、文件夹..."
        value={query}
        onChange={handleChange}
      />
      {isSearching && <span className="search-loading">搜索中...</span>}
      {query && (
        <button onClick={handleClear} className="btn-link">
          清除
        </button>
      )}
    </div>
  );
};
