import { useEffect, useRef, useState } from "react";

export function usePerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let rafId: number;

    const update = (time: number) => {
      frameCount.current++;
      const delta = time - lastTime.current;

      if (delta >= 1000) {
        const newFps = (frameCount.current / delta) * 1000;
        setFps(Math.round(newFps));
        frameCount.current = 0;
        lastTime.current = time;
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { fps };
}
