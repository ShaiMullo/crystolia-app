import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  // Required for Docker deployment
  output: "standalone",
  // Allow quality 90 for background images
  images: {
    qualities: [75, 90],
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


