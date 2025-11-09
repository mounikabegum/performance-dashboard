// app/dashboard/page.tsx
'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useDataStream, Point } from '@/hooks/useDataStream';
import ChartSelector from '@/components/charts/ChartSelector';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import ScatterPlot from '@/components/charts/ScatterPlot';
import Heatmap from '@/components/charts/Heatmap';
import TimeRangeSelector from '@/components/controls/TimeRangeSelector';
import Legend from '@/components/ui/Legend';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import DataTable from '@/components/ui/DataTable';
import DebugPanel from '@/components/ui/DebugPanel';
import { bucketMsFromMode, aggregatePoints } from '@/lib/dataAggregator';

export default function DashboardPage() {
  try { console.log('[DashboardPage] render — file loaded at', new Date().toISOString()); } catch (e) {}

  const { dataRef, tick, setPollMs, setMaxPoints } = useDataStream(100, 1000);
  const categories = useMemo(() => ['alpha', 'beta', 'gamma'], []);
  const [activeSet, setActiveSet] = useState<Set<string>>(() => new Set(categories));
  const [running, setRunning] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter' | 'heatmap'>('line');

  // filtered view
  const filteredDataRef = useRef<Point[]>([]);
  useEffect(() => {
    const src = dataRef.current || [];
    const dest: Point[] = [];
    const active = activeSet;
    for (let i = 0; i < src.length; i++) {
      const p = src[i] as Point | undefined;
      if (!p || !p.label) continue;
      if (active.has(p.label)) dest.push(p);
    }
    filteredDataRef.current = dest;
  }, [tick, activeSet]);

  // time-range & aggregation
  const [rangeMode, setRangeMode] = useState<'raw' | '1m' | '5m' | '1h'>('raw');
  const aggregatedDataRef = useRef<Point[]>([]);
  useEffect(() => {
    const bucketMs = bucketMsFromMode(rangeMode);
    aggregatedDataRef.current = bucketMs
      ? aggregatePoints(filteredDataRef.current, bucketMs)
      : filteredDataRef.current.slice();

    // filter out any stray 'default' labels
    aggregatedDataRef.current = aggregatedDataRef.current.filter(p => (p.label ?? '') !== 'default');
  }, [tick, rangeMode]);

  function toggleCategory(cat: string, checked: boolean) {
    setActiveSet(prev => {
      const next = new Set(prev);
      if (checked) next.add(cat);
      else next.delete(cat);
      return next;
    });
  }

  // small debug counters
  const [rawCount, setRawCount] = useState<number>(() => dataRef.current?.length ?? 0);
  const [aggCount, setAggCount] = useState<number>(() => aggregatedDataRef.current?.length ?? 0);
  useEffect(() => {
    const id = setInterval(() => {
      setRawCount(dataRef.current?.length ?? 0);
      setAggCount(aggregatedDataRef.current?.length ?? 0);
    }, 300);
    return () => clearInterval(id);
  }, []);

  // DEV seed helper
  function seedManyPoints(count = 10000) {
    const now = Date.now();
    const labels = ['alpha', 'beta', 'gamma'];
    const pts: Point[] = new Array(count).fill(0).map((_, i) => ({
      t: now - (count - i) * 1000,
      v: Math.sin(i / 30) * 50 + 50 + Math.random() * 2,
      label: labels[i % labels.length],
    }));
    dataRef.current = pts;
    filteredDataRef.current = pts.filter(p => activeSet.has(p.label));
    aggregatedDataRef.current = filteredDataRef.current.slice();
    try { setRawCount(dataRef.current.length); } catch {}
    try { setAggCount(aggregatedDataRef.current.length); } catch {}
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-6xl">

        {/* TITLE: centered at the very top with extra gap below */}
        <div className="w-full">
          <div className="flex items-center justify-center mt-2 mb-10">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 text-center whitespace-nowrap">
              Real-Time Visualization Dashboard
            </h1>
          </div>
        </div>

        {/* TOP ROW (Time Range left, Legend right) */}
        <div className="w-full mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
            {/* Time Range */}
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-600 mb-1">Time Range</div>
              <div className="bg-white rounded-md p-2 shadow-sm inline-block">
                <TimeRangeSelector value={rangeMode} onChange={setRangeMode} />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col items-start md:items-end">
              <div className="text-sm font-medium text-gray-600 mb-1">Legend</div>
              <div className="bg-white rounded-md p-2 shadow-sm inline-block">
                <Legend active={activeSet} onToggle={toggleCategory} order={categories} orientation="horizontal" />
              </div>
            </div>
          </div>
        </div>

        {/* CHART AREA */}
        <div className="w-full bg-white rounded-md p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-gray-600">Chart</div>
              <ChartSelector value={chartType} onChange={(v) => setChartType(v as any)} />
            </div>
            <div className="text-sm text-gray-600">Showing: <strong>{chartType.toUpperCase()}</strong></div>
          </div>

          <div>
            {chartType === 'line' && (<LineChart dataRef={aggregatedDataRef} height={420} running={running} />)}
            {chartType === 'bar' && (<BarChart dataRef={aggregatedDataRef} height={420} running={running} />)}
            {chartType === 'scatter' && (<ScatterPlot dataRef={aggregatedDataRef} height={420} running={running} />)}
            {chartType === 'heatmap' && (<Heatmap dataRef={aggregatedDataRef} height={420} rows={20} cols={80} running={running} />)}
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="flex w-full items-center justify-between gap-4 mt-4 px-2 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRunning(r => !r)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${running ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              aria-pressed={running}
            >
              {running ? 'Pause' : 'Resume'}
            </button>

            <button onClick={() => seedManyPoints(10000)} className="px-3 py-1 rounded-md text-sm font-medium bg-red-600 text-white" title="Seed 10k points (dev)">
              Seed 10k
            </button>
            <button onClick={() => seedManyPoints(50000)} className="px-3 py-1 rounded-md text-sm font-medium bg-red-700 text-white ml-2" title="Seed 50k points (dev)">
              Seed 50k
            </button>
          </div>

          <div className="flex items-center gap-6">
            <label className="text-gray-600 text-sm flex items-center gap-2">
              <span>Rate (ms)</span>
              <input type="range" defaultValue={100} min={10} max={500} onChange={(e) => setPollMs(Number(e.target.value))} />
            </label>

            <label className="text-gray-600 text-sm flex items-center gap-2">
              <span>Max points</span>
              <input type="range" defaultValue={1000} min={500} max={20000} onChange={(e) => setMaxPoints(Number(e.target.value))} />
            </label>

            <div className="text-gray-600 text-sm">Points: {aggregatedDataRef.current.length}</div>
          </div>
        </div>

        {/* Tables + DebugPanel */}
        <div className="w-full mt-6 px-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div><DataTable dataRef={filteredDataRef} height={320} rowHeight={30} title="Filtered Data (visible)" /></div>
            <div><DataTable dataRef={aggregatedDataRef as any} height={320} rowHeight={30} title="Aggregated Data" /></div>
          </div>

          {/* <-- Inline Performance monitor placed here so it appears sequentially above DebugPanel */}
          <div style={{ marginTop: 12 }}>
            <PerformanceMonitor fixed={false} />
          </div>

          <div style={{ marginTop: 12 }}>
            <DebugPanel rawCount={rawCount} aggCount={aggCount} maxDraw={5000} />
          </div>
        </div>

      </div>
    </main>
  );
}
