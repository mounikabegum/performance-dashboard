// public/renderer.worker.js
// Minimal, defensive OffscreenCanvas renderer used by LineChart.
// Supports: init, resize, draw, pause, resume
/* eslint-disable no-restricted-globals */
let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let dpr = 1;
let running = true;
let lastDrawTs = 0;
let fpsCounter = { frames: 0, last: performance.now(), fps: 0 };

function safeInit(offscreen, w, h, devicePixelRatio) {
  try {
    canvas = offscreen;
    width = Math.max(1, w || 300);
    height = Math.max(1, h || 150);
    dpr = devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style = canvas.style || {};
    ctx = canvas.getContext('2d');
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    postMessage({ type: 'worker-ready' });
  } catch (err) {
    postMessage({ type: 'error', error: 'init_failed:' + (err && err.message) });
    throw err;
  }
}

function safeResize(w, h, devicePixelRatio) {
  if (!canvas || !ctx) return;
  width = Math.max(1, w || width);
  height = Math.max(1, h || height);
  dpr = devicePixelRatio || dpr;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  postMessage({ type: 'resize', width, height, dpr });
}

function clear() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
}

function drawGrid() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.moveTo(0, height * 0.5);
  ctx.lineTo(width, height * 0.5);
  ctx.stroke();
}

function drawLines(points, colorMap, view) {
  if (!ctx) return;
  if (!points || points.length === 0) {
    drawGrid();
    return;
  }

  // Normalize & group by label
  const groups = new Map();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const label = p.label || 'default';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(p);
  }

  const minT = points[0].t || 0;
  const maxT = points[points.length - 1]?.t || (minT + 1);
  const span = Math.max(1, maxT - minT);
  const scale = (view && view.scale) || 1;
  const offset = (view && view.offset) || 0;

  for (const [label, arr] of groups.entries()) {
    if (!arr || arr.length === 0) continue;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const baseX = ((p.t - minT) / span) * width;
      const x = baseX * scale + (offset || 0);
      const y = height - ((p.v || 0) / 100) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const col = (colorMap && colorMap[label]) || '#6b7280';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  drawGrid();
}

function updateFps() {
  fpsCounter.frames++;
  const now = performance.now();
  if (now - fpsCounter.last >= 500) {
    fpsCounter.fps = Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.last));
    fpsCounter.frames = 0;
    fpsCounter.last = now;
  }
  return fpsCounter.fps;
}

onmessage = function (ev) {
  try {
    const msg = ev.data || {};
    const cmd = msg.cmd || msg.type;
    if (cmd === 'init') {
      // msg.canvas is the transferred offscreen canvas
      safeInit(msg.canvas, msg.width || 300, msg.height || 150, msg.dpr || 1);
      return;
    }
    if (cmd === 'resize') {
      safeResize(msg.width, msg.height, msg.dpr);
      return;
    }
    if (cmd === 'pause') {
      running = false;
      postMessage({ type: 'paused' });
      return;
    }
    if (cmd === 'resume') {
      running = true;
      postMessage({ type: 'resumed' });
      return;
    }
    if (cmd === 'draw') {
      if (!ctx) {
        postMessage({ type: 'error', error: 'no_ctx' });
        return;
      }
      // draw payload: { pts, view, colorMap }
      const pts = Array.isArray(msg.pts) ? msg.pts : [];
      const view = msg.view || { scale: 1, offset: 0 };
      const colorMap = msg.colorMap || {};
      clear();
      drawLines(pts, colorMap, view);
      const fps = updateFps();
      postMessage({ type: 'drawn', pts: pts.length, fps });
      return;
    }
    // unknown — ignore
  } catch (err) {
    postMessage({ type: 'error', error: err && err.message ? err.message : String(err) });
  }
};
