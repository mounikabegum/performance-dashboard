// lib/downsample.ts
export type PointLike = { t: number; v: number; label?: string };

export function downsamplePoints(
  points: PointLike[],
  buckets = 2000,
  keepMinMax = true
): PointLike[] {
  if (!points || points.length <= buckets) return points.slice();

  const n = points.length;
  const out: PointLike[] = [];
  const bucketSize = n / buckets;

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(n, Math.floor((b + 1) * bucketSize));
    if (start >= end) continue;

    if (keepMinMax) {
      // track min and max by value in bucket (preserve spikes)
      let minIdx = start;
      let maxIdx = start;
      for (let i = start + 1; i < end; i++) {
        if (points[i].v < points[minIdx].v) minIdx = i;
        if (points[i].v > points[maxIdx].v) maxIdx = i;
      }
      // push earlier time first
      if (points[minIdx].t <= points[maxIdx].t) {
        out.push(points[minIdx], points[maxIdx]);
      } else {
        out.push(points[maxIdx], points[minIdx]);
      }
    } else {
      // push representative (average)
      let sumV = 0;
      let sumT = 0;
      const labels: Record<string, number> = {};
      for (let i = start; i < end; i++) {
        sumV += points[i].v ?? 0;
        sumT += points[i].t;
        const L = points[i].label ?? 'default';
        labels[L] = (labels[L] || 0) + 1;
      }
      const avg: PointLike = {
        t: Math.round(sumT / (end - start)),
        v: sumV / (end - start),
        label: Object.keys(labels).reduce((a, b) => (labels[a] > labels[b] ? a : b)),
      };
      out.push(avg);
    }
  }

  // ensure output sorted by time
  out.sort((a, b) => a.t - b.t);
  return out;
}
