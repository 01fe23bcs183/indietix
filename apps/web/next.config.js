/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@indietix/api', '@indietix/search'],
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers'],
  },
};

module.exports = nextConfig;
