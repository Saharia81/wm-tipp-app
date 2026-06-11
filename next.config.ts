import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 + driver adapters break when Turbopack tries to bundle them.
  // Marking them external makes Next load them from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

  // Default-Limit für Server Actions ist 1 MB; Handy-Fotos sind oft 4-8 MB,
  // also 10 MB als Puffer. sharp resized danach eh auf ~25 KB WebP.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
