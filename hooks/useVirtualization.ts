// hooks/useVirtualization.ts
import { useState, useCallback } from 'react';

export function useVirtualization(itemHeight = 32, overscan = 5) {
  const [range, setRange] = useState({ start: 0, end: 0 });

  const onScroll = useCallback(
    (e: Event & { currentTarget: HTMLElement }) => {
      const el = e.currentTarget;
      const scrollTop = el.scrollTop;
      const clientH = el.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        Math.max(0, Math.ceil((scrollTop + clientH) / itemHeight) + overscan),
        Math.ceil(el.scrollHeight / itemHeight)
      );
      setRange({ start, end });
    },
    [itemHeight, overscan]
  );

  return { range, onScroll };
}
