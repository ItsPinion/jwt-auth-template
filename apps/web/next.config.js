import process from "node:process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy `/api/*` to the backend so the browser talks to a single origin
    // (no CORS, cookies just work, and it works in hosted/preview setups).
    // Override the target with API_PROXY_URL when the API lives elsewhere;
    // the default matches a locally running API (see apps/api).
    const target = process.env.API_PROXY_URL || "http://localhost:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
