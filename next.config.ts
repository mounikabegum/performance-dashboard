import type { NextConfig } from "next";

// Extend the NextConfig type to allow the redirects() function
interface NextConfigWithRedirect extends NextConfig {
  redirects?: () => Promise<
    { source: string; destination: string; permanent: boolean }[]
  >;
}

const nextConfig: NextConfigWithRedirect = {
  reactStrictMode: true,

  // Root redirect for Vercel (so "/" -> "/dashboard")
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
