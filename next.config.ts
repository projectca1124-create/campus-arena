import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Body size limit is handled via Next.js defaults (4MB).
  // The old `export const config = { api: { bodyParser: { sizeLimit } } }` 
  // Pages Router syntax was already being ignored — removing it is the correct fix.
  // If you need to increase beyond 4MB, upgrade Next.js to 14.1+ and add:
  // experimental: { serverBodySizeLimit: '8mb' } (requires Next 14.1+)
};

export default nextConfig;