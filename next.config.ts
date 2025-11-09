import { NextConfig } from "next";

type NextConfigWithExperimental = NextConfig & {
  experimental?: {
    appDir?: boolean;
    [key: string]: any;
  };
};

const nextConfig: NextConfigWithExperimental = {
  reactStrictMode: true,

  // Allow App Router explicitly
  experimental: {
    appDir: true,
  },

  // Server-side redirect so root "/" goes to "/dashboard"
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
