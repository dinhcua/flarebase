/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ["your-worker.your-account.workers.dev"],
  },
};

module.exports = nextConfig;

