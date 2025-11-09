// components/charts/ChartSelector.tsx
'use client';
import React from 'react';

export default function ChartSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const choices = ['line', 'bar', 'scatter', 'heatmap'];
  return (
    <div className="flex items-center gap-2">
      {choices.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-3 py-1 rounded-md text-sm font-medium border ${value === c ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          {c[0].toUpperCase() + c.slice(1)}
        </button>
      ))}
    </div>
  );
}
