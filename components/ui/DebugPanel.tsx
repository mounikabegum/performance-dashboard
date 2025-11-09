// components/ui/DebugPanel.tsx
'use client';
import React, { useEffect, useState } from 'react';

export default function DebugPanel({ rawCount = 0, aggCount = 0, maxDraw = 5000 } : { rawCount?: number; aggCount?: number; maxDraw?: number }) {
  const [di, setDi] = useState<any>(null);

  useEffect(() => {
    console.log('DebugPanel mounted');
    const id = setInterval(() => {
      setDi((window as any).__drawInfo || null);
    }, 300);
    return () => { clearInterval(id); console.log('DebugPanel unmounted'); };
  }, []);

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Debug Panel — (mounted)</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Raw: <strong>{rawCount}</strong></div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Aggregated: <strong>{aggCount}</strong></div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Drawn: <strong>{di ? `${di.draw} (raw:${di.raw})` : '-'}</strong></div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>MAX_DRAW: {maxDraw}</div>
    </div>
  );
}
