import React, { useEffect } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import type { Point } from '@/hooks/useDataStream';
import { downsamplePoints } from '@/lib/downsample';

// lightweight ViewRef type (matches your usage)
export type ViewRef = MutableRefObject<{ scale: number; offset: number }>;

// default color map
const COLOR_MAP: Record<string, string> = {
  alpha: '#2563eb',
  beta: '#10b981',
  gamma: '#f59e0b',
  default: '#6b7280',
};

function safeGetCtx(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function normalizePoints(arr: Array<Partial<Point>>): Point[] {
  return arr.map((p) => ({
    t: p.t ?? 0,
    v: p.v ?? 0,
    label: (p.label ?? 'default') as string,
  }));
}

// ---------------------- LINE RENDERER ----------------------
// NOTE: signature includes `width` then `height` for compatibility with callers
export function useLineRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  dataRef: MutableRefObject<Point[]>,
  widthOrHint: number, // currently unused by layout (kept for API compatibility)
  height: number,
  viewRef?: ViewRef,
  running: boolean = true,
  opts?: { skip?: boolean } // when skip=true the hook MUST not touch the canvas
) {
  useEffect(() => {
    if (opts?.skip) return; // never touch the canvas — important when transferring to Offscreen

    const canvas = canvasRef.current ?? null;
    const _ctx = safeGetCtx(canvas);
    if (!canvas || !_ctx) return;
    const ctx2: CanvasRenderingContext2D = _ctx;

    // measure with DOM rect (responsive)
    const rect = canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height || height);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    if (ctx2.setTransform) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let mounted = true;

    function drawOnce() {
      if (!mounted || !canvasRef.current) return;
      const points = dataRef.current ?? [];

      const MAX_DRAW = 5000;
      const BUCKETS = 2000;
      const KEEP_MINMAX = true;
      let drawPoints: Point[] = points;

      if (points.length > MAX_DRAW) {
        const raw = downsamplePoints(points, BUCKETS, KEEP_MINMAX) as Array<Partial<Point>>;
        drawPoints = normalizePoints(raw);
      }

      try { (window as any).__drawInfo = { raw: points.length, draw: drawPoints.length }; } catch (e) {}

      ctx2.clearRect(0, 0, cssW, cssH);

      if (!drawPoints || drawPoints.length === 0) {
        ctx2.beginPath();
        ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx2.moveTo(0, cssH * 0.5);
        ctx2.lineTo(cssW, cssH * 0.5);
        ctx2.stroke();
        return;
      }

      const minT = drawPoints[0].t;
      const maxT = drawPoints[drawPoints.length - 1].t || (minT + 1);
      const spanT = Math.max(1, maxT - minT);

      const scale = viewRef?.current?.scale ?? 1;
      const offset = viewRef?.current?.offset ?? 0;

      // group by label
      const groups = new Map<string, Point[]>();
      for (let i = 0; i < drawPoints.length; i++) {
        const p = drawPoints[i];
        const label = p.label ?? 'default';
        const arr = groups.get(label) ?? [];
        arr.push(p);
        groups.set(label, arr);
      }

      for (const [label, arr] of groups.entries()) {
        if (!arr || arr.length === 0) continue;
        ctx2.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          const baseX = ((p.t - minT) / spanT) * cssW;
          const x = baseX * scale + offset;
          const y = cssH - ((p.v ?? 0) / 100) * cssH;
          if (i === 0) ctx2.moveTo(x, y);
          else ctx2.lineTo(x, y);
        }
        ctx2.strokeStyle = COLOR_MAP[label] ?? COLOR_MAP.default;
        ctx2.lineWidth = 1.6;
        ctx2.stroke();
      }

      // center axis
      ctx2.beginPath();
      ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx2.moveTo(0, cssH * 0.5);
      ctx2.lineTo(cssW, cssH * 0.5);
      ctx2.stroke();
    }

    function loop() {
      if (!mounted) return;
      if (!running) {
        drawOnce();
        return;
      }
      drawOnce();
      raf = requestAnimationFrame(loop);
    }

    if (running) raf = requestAnimationFrame(loop);
    else drawOnce();

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
    // include opts?.skip to ensure effect re-runs if skip changes
  }, [canvasRef, dataRef, widthOrHint, height, viewRef, running, opts?.skip]);
}

// ---------------------- SCATTER RENDERER ----------------------
export function useScatterRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  dataRef: MutableRefObject<Point[]>,
  height: number,
  running: boolean = true
) {
  useEffect(() => {
    const canvas = canvasRef.current ?? null;
    const _ctx = safeGetCtx(canvas);
    if (!canvas || !_ctx) return;
    const ctx2: CanvasRenderingContext2D = _ctx;

    const rect = canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height || height);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    if (ctx2.setTransform) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let mounted = true;

    function drawOnce() {
      if (!mounted || !canvasRef.current) return;
      const points = dataRef.current ?? [];

      const MAX_DRAW = 5000;
      const BUCKETS = 2000;
      const KEEP_MINMAX = false;
      let drawPoints: Point[] = points;
      if (points.length > MAX_DRAW) {
        const raw = downsamplePoints(points, BUCKETS, KEEP_MINMAX) as Array<Partial<Point>>;
        drawPoints = normalizePoints(raw);
      }

      try { (window as any).__drawInfo = { raw: points.length, draw: drawPoints.length }; } catch (e) {}

      ctx2.clearRect(0, 0, cssW, cssH);

      if (!drawPoints || drawPoints.length === 0) {
        ctx2.beginPath();
        ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx2.moveTo(0, cssH * 0.5);
        ctx2.lineTo(cssW, cssH * 0.5);
        ctx2.stroke();
        return;
      }

      const minT = drawPoints[0].t;
      const maxT = drawPoints[drawPoints.length - 1].t || minT + 1;
      const spanT = Math.max(1, maxT - minT);

      for (let i = 0; i < drawPoints.length; i++) {
        const p = drawPoints[i];
        const x = ((p.t - minT) / spanT) * cssW;
        const y = cssH - ((p.v ?? 0) / 100) * cssH;
        const color = COLOR_MAP[p.label ?? 'default'] ?? COLOR_MAP.default;
        ctx2.beginPath();
        ctx2.fillStyle = color;
        ctx2.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx2.fill();
      }

      ctx2.beginPath();
      ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx2.moveTo(0, cssH * 0.5);
      ctx2.lineTo(cssW, cssH * 0.5);
      ctx2.stroke();
    }

    function loop() {
      if (!mounted) return;
      if (!running) {
        drawOnce();
        return;
      }
      drawOnce();
      raf = requestAnimationFrame(loop);
    }

    if (running) raf = requestAnimationFrame(loop);
    else drawOnce();

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, dataRef, height, running]);
}

// ---------------------- BAR RENDERER ----------------------
export function useBarRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  dataRef: MutableRefObject<Point[]>,
  height: number,
  running: boolean = true
) {
  useEffect(() => {
    const canvas = canvasRef.current ?? null;
    const _ctx = safeGetCtx(canvas);
    if (!canvas || !_ctx) return;
    const ctx2: CanvasRenderingContext2D = _ctx;

    const rect = canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height || height);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    if (ctx2.setTransform) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let mounted = true;

    function drawOnce() {
      if (!mounted || !canvasRef.current) return;
      const points = dataRef.current ?? [];

      const MAX_DRAW = 5000;
      const BUCKETS = 2000;
      const KEEP_MINMAX = true;
      let drawPoints: Point[] = points;
      if (points.length > MAX_DRAW) {
        const raw = downsamplePoints(points, BUCKETS, KEEP_MINMAX) as Array<Partial<Point>>;
        drawPoints = normalizePoints(raw);
      }

      try { (window as any).__drawInfo = { raw: points.length, draw: drawPoints.length }; } catch (e) {}

      ctx2.clearRect(0, 0, cssW, cssH);

      if (!drawPoints || drawPoints.length === 0) {
        ctx2.beginPath();
        ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx2.moveTo(0, cssH * 0.5);
        ctx2.lineTo(cssW, cssH * 0.5);
        ctx2.stroke();
        return;
      }

      const buckets = 60;
      const minT = drawPoints[0].t;
      const maxT = drawPoints[drawPoints.length - 1].t || minT + 1;
      const spanT = Math.max(1, maxT - minT);
      const bucketWidth = cssW / buckets;

      const counts: Record<string, number[]> = {};
      for (let i = 0; i < drawPoints.length; i++) {
        const p = drawPoints[i];
        const bi = Math.min(buckets - 1, Math.floor(((p.t - minT) / spanT) * buckets));
        const label = p.label ?? 'default';
        counts[label] = counts[label] ?? new Array(buckets).fill(0);
        counts[label][bi] += 1;
      }

      let maxCount = 1;
      for (const arr of Object.values(counts)) {
        for (let i = 0; i < arr.length; i++) if (arr[i] > maxCount) maxCount = arr[i];
      }

      const labels = Object.keys(counts);
      for (let b = 0; b < buckets; b++) {
        let x = b * bucketWidth;
        let yBase = cssH;
        for (let li = 0; li < labels.length; li++) {
          const label = labels[li];
          const cnt = counts[label][b] ?? 0;
          if (cnt <= 0) continue;
          const h = (cnt / maxCount) * (cssH * 0.8);
          ctx2.beginPath();
          ctx2.fillStyle = COLOR_MAP[label] ?? COLOR_MAP.default;
          ctx2.fillRect(x, yBase - h, bucketWidth - 1, h);
          yBase -= h;
        }
      }

      ctx2.beginPath();
      ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx2.moveTo(0, cssH * 0.5);
      ctx2.lineTo(cssW, cssH * 0.5);
      ctx2.stroke();
    }

    function loop() {
      if (!mounted) return;
      if (!running) {
        drawOnce();
        return;
      }
      drawOnce();
      raf = requestAnimationFrame(loop);
    }

    if (running) raf = requestAnimationFrame(loop);
    else drawOnce();

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, dataRef, height, running]);
}

// ---------------------- HEATMAP RENDERER ----------------------
export function useHeatmapRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  dataRef: MutableRefObject<Point[]>,
  height: number,
  rows = 20,
  cols = 80,
  running: boolean = true
) {
  useEffect(() => {
    const canvas = canvasRef.current ?? null;
    const _ctx = safeGetCtx(canvas);
    if (!canvas || !_ctx) return;
    const ctx2: CanvasRenderingContext2D = _ctx;

    const rect = canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height || height);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    if (ctx2.setTransform) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let mounted = true;

    function valueToColor(v: number) {
      const r = Math.round(255 * v);
      const g = Math.round(160 * (1 - Math.abs(0.5 - v) * 2));
      const b = Math.round(200 * (1 - v));
      return `rgb(${r},${g},${b})`;
    }

    function drawOnce() {
      if (!mounted || !canvasRef.current) return;
      const points = dataRef.current ?? [];

      const MAX_DRAW = 5000;
      const BUCKETS = 2000;
      const KEEP_MINMAX = true;
      let drawPoints: Point[] = points;
      if (points.length > MAX_DRAW) {
        const raw = downsamplePoints(points, BUCKETS, KEEP_MINMAX) as Array<Partial<Point>>;
        drawPoints = normalizePoints(raw);
      }

      try { (window as any).__drawInfo = { raw: points.length, draw: drawPoints.length }; } catch (e) {}

      ctx2.clearRect(0, 0, cssW, cssH);

      if (!drawPoints || drawPoints.length === 0) {
        ctx2.beginPath();
        ctx2.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx2.moveTo(0, cssH * 0.5);
        ctx2.lineTo(cssW, cssH * 0.5);
        ctx2.stroke();
        return;
      }

      const minT = drawPoints[0].t;
      const maxT = drawPoints[drawPoints.length - 1].t || minT + 1;
      const spanT = Math.max(1, maxT - minT);
      const cellW = cssW / cols;
      const cellH = cssH / rows;

      const labels = Array.from(new Set(drawPoints.map((p) => p.label ?? 'default')));
      const labelToRow: Record<string, number> = {};
      for (let i = 0; i < labels.length; i++) labelToRow[labels[i]] = i % rows;

      const accum: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
      const count: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

      for (let i = 0; i < drawPoints.length; i++) {
        const p = drawPoints[i];
        const ci = Math.min(cols - 1, Math.floor(((p.t - minT) / spanT) * cols));
        const row = labelToRow[p.label ?? 'default'] ?? 0;
        const v = (p.v ?? 0) / 100;
        accum[row][ci] += v;
        count[row][ci] += 1;
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cnt = count[r][c];
          const avg = cnt > 0 ? accum[r][c] / cnt : 0;
          const clr = valueToColor(Math.min(1, Math.max(0, avg)));
          ctx2.fillStyle = clr;
          ctx2.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      ctx2.strokeStyle = 'rgba(255,255,255,0.06)';
      for (let r = 1; r < rows; r++) {
        ctx2.beginPath();
        ctx2.moveTo(0, r * cellH);
        ctx2.lineTo(cssW, r * cellH);
        ctx2.stroke();
      }
    }

    function loop() {
      if (!mounted) return;
      if (!running) {
        drawOnce();
        return;
      }
      drawOnce();
      raf = requestAnimationFrame(loop);
    }

    if (running) raf = requestAnimationFrame(loop);
    else drawOnce();

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, dataRef, height, rows, cols, running]);
}
