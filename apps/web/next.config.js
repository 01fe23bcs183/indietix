/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@indietix/ui",
    "@indietix/api",
    "@indietix/db",
    "@indietix/utils",
  ],
};

module.exports = nextConfig;
