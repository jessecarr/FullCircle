import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
    proxyClientMaxBodySize: '60mb',
  },
};

export default nextConfig;
