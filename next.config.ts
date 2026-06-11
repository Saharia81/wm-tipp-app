import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 + driver adapters break when Turbopack tries to bundle them.
  // Marking them external makes Next load them from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

  // Default-Limit für Server Actions ist 1 MB — passt jetzt locker, weil
  // das Bild im Browser auf 256x256 JPEG (~30 KB) verkleinert wird, bevor
  // es überhaupt zum Server geht.
};

export default nextConfig;
