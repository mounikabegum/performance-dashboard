'use client';
import React, { useRef } from 'react';
import { useHeatmapRenderer } from '@/hooks/useChartRenderer';
import type { Point } from '@/hooks/useDataStream';

type AnyRefPoint = React.RefObject<Point[]> | React.MutableRefObject<Point[]>;

export default function Heatmap({
  dataRef,
  height = 400,
  rows = 20,
  cols = 80,
  running = true,
}: {
  dataRef: AnyRefPoint;
  height?: number;
  rows?: number;
  cols?: number;
  running?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useHeatmapRenderer(canvasRef as React.RefObject<HTMLCanvasElement | null>, dataRef as React.MutableRefObject<Point[]>, height, rows, cols, running);

  return (
    <div style={{ width: '100%', height }}>
      <div className="border border-gray-300 bg-white rounded-md shadow-sm overflow-hidden" style={{ width: '100%', height }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
