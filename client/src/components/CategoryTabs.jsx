import React from 'react';

const CATEGORIES = ['All', 'Images', 'Documents', 'Media', 'Archives', 'Code', 'Others'];

export default function CategoryTabs({ active, onChange }) {
  return (
    <div className="category-tabs">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          id={`tab-${cat.toLowerCase()}`}
          className={`tab-btn ${active === cat ? 'active' : ''}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
