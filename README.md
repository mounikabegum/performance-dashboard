README — Real-Time Visualization Dashboard

🧭 Real-Time Visualization Dashboard

A high-performance, real-time data visualization dashboard built with Next.js (App Router) + TypeScript.
It can smoothly render and update 10,000+ data points at 60 FPS using a Canvas + SVG hybrid renderer with Web Workers (OffscreenCanvas) for background drawing.

🌐 Live Demo

🔗 https://performance-dashboard-jade-three.vercel.app

Hosted on Vercel — optimized production build running with Next.js 16.

🚀 Features
- Multiple Chart Types: Line, Bar, Scatter, Heatmap (custom-built, no chart libraries)
- Real-Time Data Streaming: Simulated new data every 100 ms
- Interactive Controls: Zoom, pan, filter, and time-range selection (Raw, 1 min, 5 min, 1 hour)
- Data Aggregation: Group data into 1 min, 5 min, or 1 hour intervals
- Virtualized Data Table: Efficient scrolling and rendering of large data sets
- Responsive Layout: Optimized for desktop, tablet, and mobile
- Performance Monitor: Live FPS counter and memory usage tracker
- Stress-Test Mode: Buttons to seed 10 k / 50 k data points for benchmarking

⚙️ Setup & Usage
1. Install Dependencies
   npm install
2. Run Development Server
   npm run dev
   Visit http://localhost:3000/dashboard
3. Build & Run Production
   npm run build
   npm run start

🧪 Performance Testing Instructions
1. Launch the app and open Dashboard.
2. Use “Seed 10k” or “Seed 50k” buttons to simulate heavy loads.
3. Observe FPS and Memory panels in the dashboard.
4. Record Chrome DevTools → Performance for 30–60s.
5. For stability testing, run 30–60 minutes to verify no leaks.

🌍 Browser Compatibility
Chrome ✅ (full OffscreenCanvas support)
Edge ✅ (identical to Chrome)
Firefox ⚠️ (partial OffscreenCanvas support)
Safari ⚠️ (fallback to main-thread canvas rendering)

🧠 Next.js-Specific Optimizations
- App Router architecture (Server vs Client components)
- Route Handlers (app/api/data/route.ts)
- Streaming + Suspense for progressive hydration
- Dynamic Imports for chart components
- Edge-ready deployment
- Tree Shaking & Minification via next build

🧩 Project Structure
performance-dashboard/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/data/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── charts/
│   ├── controls/
│   ├── ui/
│   └── providers/
├── hooks/
├── lib/
├── public/
│   └── renderer.worker.js
├── package.json
├── next.config.js
├── tsconfig.json
├── README.md
└── PERFORMANCE.md

⚡ Troubleshooting
- Worker not initializing → Browser lacks OffscreenCanvas (automatic fallback)
- Low FPS → Reduce points or enable aggregation
- Memory leak → Verify sliding window cleanup in DataProvider
- Build errors → Ensure Node ≥ 18, Next ≥ 14

📸 Screenshots / Recordings

Dashboard View: public\Screenshots\Dashboard.png
Datatable View: public\Screenshots\Datatable.png

Stress-Test Demo: public\Screenshots\stress-test.mp4

📄 License
MIT — Educational and demonstration use only.

