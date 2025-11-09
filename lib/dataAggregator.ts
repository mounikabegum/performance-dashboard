// lib/dataAggregator.ts
import type { Point } from '@/hooks/useDataStream';

/**
 * bucketMsFromMode
 * supported modes:
 *  - 'raw'  => no aggregation
 *  - '1m'   => 60 * 1000
 *  - '5m'   => 5 * 60 * 1000
 *  - '1h'   => 60 * 60 * 1000
 */
export function bucketMsFromMode(mode: 'raw' | '1m' | '5m' | '1h') {
  switch (mode) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * aggregatePoints
 * - points: array of Point {t, v, label}
 * - bucketMs: if 0 => return raw points sorted by time
 *
 * returns aggregated points: one point per (label,bucket)
 */
export function aggregatePoints(points: Point[], bucketMs: number) {
  if (!bucketMs || bucketMs <= 0) {
    // return shallow copy sorted by time
    return points.slice().sort((a, b) => a.t - b.t);
  }

  // Map<label, Map<bucketStart, {sum, count}>>
  const agg = new Map<string, Map<number, { sum: number; count: number }>>();

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const label = p.label ?? 'default';
    const bucket = Math.floor(p.t / bucketMs) * bucketMs;

    let byLabel = agg.get(label);
    if (!byLabel) {
      byLabel = new Map();
      agg.set(label, byLabel);
    }

    const acc = byLabel.get(bucket);
    if (!acc) {
      byLabel.set(bucket, { sum: p.v, count: 1 });
    } else {
      acc.sum += p.v;
      acc.count += 1;
    }
  }

  // Build result: for each label and bucket produce averaged point at bucket center
  const out: Point[] = [];
  for (const [label, byLabel] of agg.entries()) {
    for (const [bucketStart, { sum, count }] of byLabel.entries()) {
      out.push({
        t: bucketStart + Math.floor(bucketMs / 2), // center-ish timestamp
        v: sum / count,
        label,
      });
    }
  }

  // return unified array sorted by time (optional: could be grouped per-label)
  out.sort((a, b) => a.t - b.t);
  return out;
}
