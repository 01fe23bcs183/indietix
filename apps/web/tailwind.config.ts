import type { Config } from "tailwindcss";
import baseConfig from "@indietix/ui/tailwind.config";

const config: Config = {
  ...baseConfig,
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
