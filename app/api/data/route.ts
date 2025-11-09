// app/api/data/route.ts
import { NextResponse } from "next/server";

// Function to create fake sample data points
function createSample(index: number) {
  const timestamp = Date.now() + index * 50;
  const magnitude = (Math.sin(index / 10) + 1) * 40 + Math.random() * 20;
  const label = ["alpha", "beta", "gamma"][Math.floor(Math.random() * 3)];
  return { timestamp, magnitude, label };
}

// API GET handler — returns an array of fake data
export async function GET() {
  const result = Array.from({ length: 500 }, (_, i) => createSample(i));
  return NextResponse.json({ result });
}
