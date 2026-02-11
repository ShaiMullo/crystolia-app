import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment
  output: "standalone",
  // Consolidated images configuration
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
