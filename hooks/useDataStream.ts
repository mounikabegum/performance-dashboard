// hooks/useDataStream.ts
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export type Point = {
  t: number;        // timestamp (ms)
  v: number;        // value (0..100 approx)
  label: string;    // 'alpha' | 'beta' | 'gamma' (for filtering)
  // optional additional fields (metadata) may exist
};

type UseDataStreamReturn = {
  dataRef: React.MutableRefObject<Point[]>;
  tick: number;
  running: boolean;
  setPollMs: (ms: number) => void;
  setMaxPoints: (n: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export function useDataStream(initialPollMs = 100, initialMaxPoints = 1000): UseDataStreamReturn {
  const dataRef = useRef<Point[]>([]);
  const [tick, setTick] = useState(0); // light-weight signal to indicate data update
  const [pollMs, setPollMsState] = useState(initialPollMs);
  const [maxPoints, setMaxPointsState] = useState(initialMaxPoints);
  const runningRef = useRef(true);

  // Expose stable setters
  const setPollMs = useCallback((ms: number) => {
    setPollMsState(ms);
  }, []);

  const setMaxPoints = useCallback((n: number) => {
    setMaxPointsState(n);
  }, []);

  const pause = useCallback(() => {
    runningRef.current = false;
  }, []);

  const resume = useCallback(() => {
    runningRef.current = true;
  }, []);

  const reset = useCallback(() => {
    dataRef.current = [];
    setTick((t) => t + 1);
  }, []);

  // data generator + poll loop
  useEffect(() => {
    // categories used for label assignment
    const labels = ['alpha', 'beta', 'gamma'];

    let intervalId: ReturnType<typeof setInterval> | null = null;

    function pushPoint() {
      if (!runningRef.current) return;

      const t = Date.now();
      // synthetic value (sine + noise) normalized roughly to 0..100
      const raw = Math.sin(t / 500) * 40 + 50 + (Math.random() - 0.5) * 10;
      const v = Math.max(0, Math.min(100, raw));

      const p: Point = {
        t,
        v,
        label: labels[Math.floor(Math.random() * labels.length)],
      };

      // push to buffer and maintain sliding window
      dataRef.current.push(p);
      if (dataRef.current.length > maxPoints) {
        // remove older items
        const remove = dataRef.current.length - maxPoints;
        dataRef.current.splice(0, remove);
      }

      // lightweight signal for consumers (charts use dataRef directly; they can use tick to re-evaluate filters)
      setTick((n) => n + 1);
    }

    // start interval
    intervalId = setInterval(pushPoint, pollMs);

    // also push one immediately on start so UI is not empty
    pushPoint();

    // cleanup / restart whenever pollMs or maxPoints change
    return () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };
  }, [pollMs, maxPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // ensure runningRef reflects a boolean value accessible outside
  const running = runningRef.current;

  return {
    dataRef,
    tick,
    running,
    setPollMs,
    setMaxPoints,
    pause,
    resume,
    reset,
  };
}
