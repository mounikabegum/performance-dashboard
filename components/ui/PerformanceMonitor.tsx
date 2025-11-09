// components/ui/PerformanceMonitor.tsx
'use client';
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  /** default true -> fixed overlay; set false to render inline box */
  fixed?: boolean;
};

export default function PerformanceMonitor({ fixed = true }: Props): React.ReactElement {
  const [fps, setFps] = useState<number | null>(null);
  const [mem, setMem] = useState<{ usedMB: number; totalMB?: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // small mount log to confirm component is mounted
    try { console.info('[PerformanceMonitor] mounted', { fixed }); } catch (e) {}

    let mounted = true;
    let frames = 0;
    let lastFpsUpdate = performance.now();
    const FPS_UPDATE_MS = 500;

    function loop(now: number) {
      frames++;
      const elapsed = now - lastFpsUpdate;
      if (elapsed >= FPS_UPDATE_MS) {
        const measured = Math.round((frames * 1000) / elapsed);
        if (mounted) setFps(measured);
        frames = 0;
        lastFpsUpdate = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const memInterval = setInterval(() => {
      if (!mounted) return;
      const nav = (window as any).performance;
      if (nav && nav.memory && typeof nav.memory.usedJSHeapSize === 'number') {
        const used = nav.memory.usedJSHeapSize / (1024 * 1024);
        const total = typeof nav.memory.jsHeapSizeLimit === 'number'
          ? nav.memory.jsHeapSizeLimit / (1024 * 1024)
          : undefined;
        setMem({ usedMB: Math.round(used * 10) / 10, totalMB: total ? Math.round(total * 10) / 10 : undefined });
      } else {
        setMem(null);
      }
    }, 400);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(memInterval);
    };
  }, [fixed]);

  // ------- styles -------
  const outerCommon: React.CSSProperties = {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    pointerEvents: 'none',
  };

  if (fixed) {
    // existing floating overlay (bottom-left)
    return (
      <div id="perf-monitor" style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 2147483647, ...outerCommon }}>
        <div style={{
          background: '#031024',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(2,6,23,0.5)',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <div>FPS: <span style={{ color: '#7dd3fc', marginLeft: 8 }}>{fps ?? '—'}</span></div>

          <div style={{
            background: '#fff',
            color: '#111827',
            padding: '6px 8px',
            borderRadius: 8,
            fontWeight: 600,
            minWidth: 120,
            textAlign: 'left'
          }}>
            <div style={{ fontSize: 12, color: '#111827' }}>
              Memory: {mem ? `${mem.usedMB} MB${mem.totalMB ? ` / ${mem.totalMB} MB` : ''}` : 'N/A'}
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: mem && mem.totalMB ? `${Math.min(100, Math.round((mem.usedMB / (mem.totalMB || 1)) * 100))}%` : mem ? '40%' : '0%',
                background: mem ? (mem.usedMB > (mem.totalMB ?? 0) * 0.9 ? '#ef4444' : '#10b981') : '#9ca3af',
                transition: 'width 300ms linear'
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              {mem ? (mem.totalMB ? `${Math.round((mem.usedMB / (mem.totalMB || 1)) * 100)}% used` : 'Heap info limited') : 'Memory API N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline box (flows in document) — use when you want the monitor displayed sequentially
  return (
    <div id="perf-monitor-inline" style={{ marginTop: 12, ...outerCommon }}>
      <div style={{
        background: '#ffffff',
        color: '#111827',
        padding: '10px 14px',
        borderRadius: 8,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
        fontSize: 13,
        fontWeight: 700,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Performance</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>FPS: <span style={{ color: '#0ea5e9', marginLeft: 8 }}>{fps ?? '—'}</span></div>
        </div>

        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Memory</div>
          <div style={{ fontSize: 14, color: '#111827' }}>
            {mem ? `${mem.usedMB} MB${mem.totalMB ? ` / ${mem.totalMB} MB` : ''}` : 'N/A'}
          </div>

          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: mem && mem.totalMB ? `${Math.min(100, Math.round((mem.usedMB / (mem.totalMB || 1)) * 100))}%` : mem ? '40%' : '0%',
              background: mem ? (mem.usedMB > (mem.totalMB ?? 0) * 0.9 ? '#ef4444' : '#10b981') : '#94a3b8',
              transition: 'width 300ms linear'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
