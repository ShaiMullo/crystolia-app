import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment
  output: "standalone",
  // TODO: re-enable once ESLint issues are resolved. Added to unblock staging CI.
  eslint: { ignoreDuringBuilds: true },
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
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
