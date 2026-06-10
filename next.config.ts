import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 + driver adapters break when Turbopack tries to bundle them.
  // Marking them external makes Next load them from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
