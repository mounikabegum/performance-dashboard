'use client';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { Point } from '@/hooks/useDataStream';

type DataTableProps = {
  dataRef: MutableRefObject<Point[]>;
  height?: number;        // panel height in px
  rowHeight?: number;     // row height in px
  overscan?: number;      // extra rows to render above/below
  title?: string;
};

export default function DataTable({
  dataRef,
  height = 300,
  rowHeight = 28,
  overscan = 5,
  title = 'Data Table',
}: DataTableProps) {
  // debug mount
  useEffect(() => {
    console.log('DataTable mounted:', title);
    return () => console.log('DataTable unmounted:', title);
  }, [title]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  // read snapshot of dataRef (avoid heavy rerenders)
  const data = dataRef.current ?? [];

  const totalRows = data.length;
  const visibleCount = Math.ceil(height / rowHeight);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(totalRows, startIndex + visibleCount + overscan * 2);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalRows - endIndex) * rowHeight);

  // render visible slice (stable reference)
  const visibleRows = useMemo(() => {
    return data.slice(startIndex, endIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex, endIndex, data.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // stable handler reference so we can remove it later
    const onScroll = () => {
      setScrollTop(el.scrollTop);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      // use the same captured `el` ref; guard against null
      if (el) {
        el.removeEventListener('scroll', onScroll);
      }
    };
  }, []); // run once on mount

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title} — (debug visible)</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{totalRows.toLocaleString()} rows</div>
      </div>

      <div
        ref={containerRef}
        style={{
          height,
          overflow: 'auto',
          borderRadius: 8,
          background: '#fff',
          border: '1px solid #e6e6e6',
          boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
          width: '100%',
        }}
      >
        <div style={{ height: totalRows * rowHeight, position: 'relative' }}>
          <div style={{ height: topPadding }} />
          <div style={{ position: 'relative' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, color: '#374151' }}>Time</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 12, color: '#374151' }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, color: '#374151' }}>Label</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((p, i) => {
                  const idx = startIndex + i;
                  return (
                    <tr key={idx} style={{ height: rowHeight, borderTop: '1px solid #f3f3f3' }}>
                      <td style={{ padding: '6px 10px', fontSize: 13, color: '#111827' }}>
                        {new Date(p.t).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 13, color: '#111827', textAlign: 'right' }}>
                        {Number(p.v).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 13, color: '#111827' }}>
                        {p.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ height: bottomPadding }} />
        </div>
      </div>
    </div>
  );
}
