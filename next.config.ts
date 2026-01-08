import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/downloads/:filename',
          destination: '/api/download',
        },
      ],
    };
  },
};

export default nextConfig;
