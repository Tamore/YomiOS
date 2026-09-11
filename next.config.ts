import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile testing on local network
  // @ts-ignore
  allowedDevOrigins: ['172.20.10.9'],
};

export default nextConfig;
