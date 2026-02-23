const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Tell Next.js where the monorepo root is for file tracing (used in Docker builds)
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },

  // In development, proxy /api/* to the Express backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
