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
};

module.exports = withPWA(nextConfig);
