import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Configure remote image patterns for S3
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.scw.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.*.scw.cloud",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Disable dev indicator
  devIndicators: false,
};

export default nextConfig;
