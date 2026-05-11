const nextConfig = {
  output: "standalone",
  turbopack: {
    // Pin the workspace root so Turbopack does not pick up the repo-root
    // lockfile (which causes mismatched chunk paths in dev).
    root: import.meta.dirname,
  },
  async rewrites() {
    // BACKEND_URL is set by docker-compose to http://backend:4000.
    // Local `next dev` falls back to http://localhost:4000 so it works without env setup.
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
