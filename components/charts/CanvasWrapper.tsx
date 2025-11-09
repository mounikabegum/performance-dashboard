// components/charts/CanvasWrapper.tsx
'use client';
import React from 'react';

export default function CanvasWrapper({
  width,
  children,
  running = true,
}: {
  width?: number | string;
  children: React.ReactNode;
  running?: boolean;
}) {
  return (
    <div style={{ position: 'relative', width }}>
      {children}
      {!running && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.96)',
            padding: '10px 16px',
            borderRadius: 10,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            fontWeight: 700,
            color: '#111827',
            pointerEvents: 'none',
            zIndex: 20,
            fontSize: 16,
          }}
        >
          Paused
        </div>
      )}
    </div>
  );
}
