import React from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-wrap">
      <Search size={15} />
      <input
        id="search-files"
        type="text"
        className="search-input"
        placeholder="Search files by name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
