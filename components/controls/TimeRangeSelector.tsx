// TimeRangeSelector.tsx
'use client';

import React from 'react';

type Mode = 'raw' | '1m' | '5m' | '1h';

export default function TimeRangeSelector({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (v: Mode) => void;
}) {
  const items: { key: Mode; label: string }[] = [
    { key: 'raw', label: 'Raw' },
    { key: '1m', label: '1 min' },
    { key: '5m', label: '5 min' },
    { key: '1h', label: '1 hour' },
  ];

  return (
    // Single compact white box that fits the buttons exactly
    <div className="bg-white rounded-md p-2 shadow-sm inline-block">
      <div className="flex items-center gap-3">
        {items.map((it) => {
          const selected = it.key === value;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={
                'select-none font-medium rounded-lg px-6 py-3 text-lg transition ' +
                (selected
                  ? 'bg-indigo-50 text-gray-900 border-2 border-gray-800 shadow-inner'
                  : 'bg-transparent text-gray-800 border border-gray-900/90')
              }
              aria-pressed={selected}
              type="button"
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
