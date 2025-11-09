// components/ui/Legend.tsx
'use client';
import React from 'react';
import { COLOR_MAP } from '@/lib/colors';

export default function Legend({
  active,
  onToggle,
  order = ['alpha', 'beta', 'gamma'],
  orientation = 'horizontal', // 'horizontal' | 'vertical'
}: {
  active: Set<string>;
  onToggle: (label: string, checked: boolean) => void;
  order?: string[];
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
      }}
    >
      {order.map((label) => {
        const color = (COLOR_MAP as any)[label] ?? '#6b7280';
        const isActive = active.has(label);
        return (
          <button
            key={label}
            onClick={() => onToggle(label, !isActive)}
            aria-pressed={isActive}
            style={{
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 8,
              border: `2px solid ${isActive ? color : '#e5e7eb'}`,
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
            title={label}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: color,
                display: 'inline-block',
              }}
            />
            <span style={{ textTransform: 'capitalize', color: '#111827' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
