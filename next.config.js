/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ["flarebase.kuquaysut.workers.dev"],
  },
};

module.exports = nextConfig;
