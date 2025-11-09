'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useLineRenderer, ViewRef } from '@/hooks/useChartRenderer';
import type { Point } from '@/hooks/useDataStream';

type AnyRefPoint = React.RefObject<Point[]> | React.MutableRefObject<Point[]>;

const COLOR_MAP: Record<string, string> = {
  alpha: '#2563eb',
  beta: '#10b981',
  gamma: '#f59e0b',
  default: '#6b7280',
};

export default function LineChart({
  dataRef,
  height = 400,
  running = true,
  title = 'Chart Dashboard',
}: {
  dataRef: AnyRefPoint;
  height?: number;
  running?: boolean;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const offscreenTransferredRef = useRef(false);
  const viewRef = React.useRef<{ scale: number; offset: number }>({ scale: 1, offset: 0 });

  // feature-detect OffscreenCanvas & Worker capability
  const canOffscreen =
    typeof window !== 'undefined' &&
    typeof (window as any).OffscreenCanvas !== 'undefined' &&
    typeof Worker !== 'undefined';

  // runtime toggle: try using worker if possible, but switch to main-thread if worker init fails
  const [useWorker, setUseWorker] = useState<boolean>(canOffscreen);

  // Hook: main-thread renderer is used as fallback. Pass skip = useWorker so we don't touch canvas when worker is active.
  (useLineRenderer as any)(
    canvasRef as React.RefObject<HTMLCanvasElement | null>,
    dataRef as React.MutableRefObject<Point[]>,
    /* widthHint */ 1000,
    height,
    viewRef as ViewRef,
    running,
    { skip: useWorker } // when true we skip main-thread drawing
  );

  function preparePointsForWorker(points: Point[]) {
    return points.map(p => ({ t: p.t, v: p.v, label: p.label }));
  }

  function postViewDrawImmediate() {
    const w = workerRef.current;
    if (!w) return;
    try {
      const pts = (dataRef as React.MutableRefObject<Point[]>).current ?? [];
      const prepared = preparePointsForWorker(pts);
      w.postMessage({
        cmd: 'draw',
        pts: prepared,
        debug: true,
        view: { scale: viewRef.current.scale, offset: viewRef.current.offset },
        colorMap: COLOR_MAP,
      });
    } catch (e) {
      // ignore
    }
  }

  // Worker init and Offscreen transfer. If anything fails -> fall back to main-thread renderer (setUseWorker(false))
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      console.info('[LineChart] no canvas element found during init');
      return;
    }

    if (!canOffscreen) {
      // Offscreen not supported — ensure main-thread rendering
      if (useWorker) setUseWorker(false);
      console.info('[LineChart] OffscreenCanvas not available — using main-thread renderer.');
      return;
    }

    if (!useWorker) {
      // user / runtime decided not to use worker
      return;
    }

    // If we've already transferred an offscreen to a worker, do nothing.
    if (offscreenTransferredRef.current) return;

    try {
      const w = new Worker('/renderer.worker.js');
      workerRef.current = w;

      w.onmessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        // keep noisy logs minimal; helpful debug messages:
        if (msg?.type === 'worker-ready') {
          console.info('[LineChart] worker ready');
          return;
        }
        if (msg?.type === 'drawn') {
          try {
            (window as any).__drawInfo = {
              raw: (dataRef as any).current?.length ?? 0,
              draw: msg.pts ?? 0,
              fps: msg.fps ?? undefined,
            };
          } catch (e) { /* ignore */ }
          return;
        }
        if (msg?.type === 'error') {
          console.error('[LineChart][worker] error:', msg.error);
          return;
        }
        // unexpected messages - log at debug level
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[LineChart][worker] msg:', msg);
        }
      };

      w.onerror = (err) => {
        console.error('[LineChart][worker] onerror', err);
        // fallback to main-thread renderer
        try { w.terminate(); } catch (e) {}
        workerRef.current = null;
        offscreenTransferredRef.current = false;
        setUseWorker(false);
      };

      // compute dimensions & transfer
      const rect = canvasEl.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const widthPx = Math.max(1, Math.round(rect.width));
      const heightPx = Math.max(1, Math.round(rect.height || height));

      // try transfer - may throw if canvas already has a context
      const offscreen = (canvasEl as any).transferControlToOffscreen();
      w.postMessage({ cmd: 'init', canvas: offscreen, width: widthPx, height: heightPx, dpr }, [offscreen]);

      offscreenTransferredRef.current = true;

      // Observe size changes and forward to worker
      const ro = new ResizeObserver(() => {
        const r = canvasEl.getBoundingClientRect();
        const wPx = Math.max(1, Math.round(r.width));
        const hPx = Math.max(1, Math.round(r.height));
        try {
          w.postMessage({ cmd: 'resize', width: wPx, height: hPx, dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1 });
        } catch (e) {
          // ignore postMessage errors
        }
      });
      ro.observe(canvasEl);

      // On unmount cleanup
      return () => {
        ro.disconnect();
        try { w.terminate(); } catch {}
        workerRef.current = null;
      };
    } catch (err) {
      // Worker init failed - fall back to main-thread renderer
      console.warn('[LineChart] worker init failed, falling back to main-thread renderer:', err);
      if (workerRef.current) {
        try { workerRef.current.terminate(); } catch {}
        workerRef.current = null;
      }
      offscreenTransferredRef.current = false;
      setUseWorker(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWorker]); // watch useWorker so fallback -> re-run effect only when it changes

  // schedule draws to worker (only while worker active && running is true)
  useEffect(() => {
    if (!workerRef.current) return;
    let raf = 0;
    let mounted = true;
    const workerDebug = typeof window !== 'undefined' && (window as any).localStorage?.getItem?.('workerDebug') === '1';

    function scheduleDraw() {
      if (!mounted) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const w = workerRef.current;
        if (!w) return;
        const pts = (dataRef as React.MutableRefObject<Point[]>).current ?? [];
        const prepared = preparePointsForWorker(pts);
        try {
          w.postMessage({
            cmd: 'draw',
            pts: prepared,
            debug: workerDebug,
            view: { scale: viewRef.current.scale, offset: viewRef.current.offset },
            colorMap: COLOR_MAP,
          });
        } catch (e) {
          console.warn('[LineChart] worker draw failed', e);
        }
      });
    }

    const id = setInterval(() => {
      if (running && workerRef.current) scheduleDraw();
    }, 100);

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [dataRef, running, height, useWorker]);

  // watch running -> send pause/resume to worker (if any)
  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    try {
      if (!running) {
        w.postMessage({ cmd: 'pause' });
        postViewDrawImmediate();
      } else {
        w.postMessage({ cmd: 'resume' });
        postViewDrawImmediate();
      }
    } catch (e) {
      // worker may have been terminated — ensure fallback
      console.warn('[LineChart] failed to message worker, disabling worker path', e);
      setUseWorker(false);
    }
  }, [running]);

  // pointer handlers (wheel zoom & drag pan) — unchanged but post immediate draw
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    let isDragging = false;
    let lastX = 0;
    let lastPointerId: number | null = null;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const zoomFactor = Math.exp(-e.deltaY * 0.0011);
      const oldScale = viewRef.current.scale;
      const newScale = Math.max(0.25, Math.min(8, oldScale * zoomFactor));
      const baseX = (cursorX - viewRef.current.offset) / oldScale;
      viewRef.current.scale = newScale;
      viewRef.current.offset = cursorX - baseX * newScale;
      postViewDrawImmediate();
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastPointerId = e.pointerId;
      if (typeof el.setPointerCapture === 'function') {
        try { el.setPointerCapture(lastPointerId); } catch {}
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      viewRef.current.offset += dx;
      postViewDrawImmediate();
    };

    const onPointerUp = () => {
      isDragging = false;
      if (lastPointerId !== null && typeof el.releasePointerCapture === 'function') {
        try { el.releasePointerCapture(lastPointerId); } catch {}
      }
      lastPointerId = null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === '0') {
        viewRef.current.scale = 1;
        viewRef.current.offset = 0;
        postViewDrawImmediate();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
      el.removeEventListener('pointerdown', onPointerDown as EventListener);
      window.removeEventListener('pointermove', onPointerMove as EventListener);
      window.removeEventListener('pointerup', onPointerUp as EventListener);
      window.removeEventListener('keydown', onKey as EventListener);
    };
  }, []); // run once

  // Render
  return (
    <div style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
      </div>

      <div style={{ position: 'relative', width: '100%', height }}>
        <div className="border border-gray-300 bg-white rounded-md shadow-sm overflow-hidden" style={{ width: '100%', height }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Legend (top-right) */}
        <div style={{
          position: 'absolute', right: 12, top: 12, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.92)', padding: '6px 10px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
          pointerEvents: 'auto', zIndex: 30, fontSize: 13
        }}>
          {Object.keys(COLOR_MAP).map((label) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: COLOR_MAP[label], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)' }} />
              <div style={{ color: '#111827', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Reset hint */}
        <div style={{
          position: 'absolute', left: 12, bottom: 12, background: 'rgba(17,24,39,0.9)', color: '#fff',
          padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, zIndex: 30, pointerEvents: 'none'
        }} aria-hidden>
          Reset offset — press <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>0</span>
        </div>
      </div>
    </div>
  );
}
