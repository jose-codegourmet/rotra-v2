import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export: `next build` writes the whole site to out/
  output: 'export',
  images: { unoptimized: true },
  // A second dev server (another agent or port) sets ROTRA_DIST_DIR so it does not share .next's lock
  ...(process.env.ROTRA_DIST_DIR ? { distDir: process.env.ROTRA_DIST_DIR } : {}),
}

export default nextConfig
