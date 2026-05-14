import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@carbon/react", "@carbon/styles", "@carbon/icons-react"],
};

export default nextConfig;
