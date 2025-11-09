// components/controls/FilterPanel.tsx
'use client';
import React from 'react';

export default function FilterPanel({
  categories,
  active,
  onToggle,
}: {
  categories: string[];
  active: Set<string>;
  onToggle: (label: string, checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
      {categories.map((label) => {
        const checked = active.has(label);
        return (
          <label key={label} className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(label, e.target.checked)}
              className="form-checkbox h-4 w-4"
            />
            <span className="capitalize">{label}</span>
          </label>
        );
      })}
    </div>
  );
}
