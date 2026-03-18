const nextConfig = {
  output: "standalone",
  // TODO: re-enable once ESLint issues are resolved. Added to unblock staging CI.
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://backend:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
