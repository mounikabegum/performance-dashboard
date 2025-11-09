// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Try a client-side redirect immediately
    try {
      router.replace('/dashboard');
    } catch (e) {
      // if that fails, fallback to location replace
      // (this always forces the browser to go to /dashboard)
      window.location.replace('/dashboard');
    }
  }, [router]);

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Redirecting to the Dashboard…</h1>
        <p>If you are not redirected automatically, <a href="/dashboard">click here to go to the dashboard</a>.</p>
      </div>
    </main>
  );
}
