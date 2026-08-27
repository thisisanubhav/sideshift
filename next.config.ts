import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: there is a lockfile in a parent directory and
  // Turbopack otherwise guesses wrong.
  turbopack: { root: __dirname },
};

export default nextConfig;
