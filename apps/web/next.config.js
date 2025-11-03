/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@indietix/ui",
    "@indietix/api",
    "@indietix/db",
    "@indietix/utils",
    "@indietix/fraud",
    "@indietix/marketing",
    "@indietix/notify",
    "@indietix/payments",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("bcrypt");
    }
    return config;
  },
};

module.exports = nextConfig;
