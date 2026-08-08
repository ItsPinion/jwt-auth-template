import process from "node:process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const target = process.env.API_PROXY_URL;

    if (!target) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
