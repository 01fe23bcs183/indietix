const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@indietix/ui",
    "@indietix/api",
    "@indietix/db",
    "@indietix/utils",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('bcrypt');
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
