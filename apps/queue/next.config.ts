import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A second dev server (another agent or port) sets ROTRA_DIST_DIR so it does not share .next's lock
  ...(process.env.ROTRA_DIST_DIR ? { distDir: process.env.ROTRA_DIST_DIR } : {}),
  turbopack: {
    resolveAlias:
      process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ROTRA_DEV_MENU !== '1'
        ? { '@/providers/DevTools': './src/providers/DisabledDevTools.tsx' }
        : {},
  },
  // Workspace packages ship TypeScript source, not built files
  transpilePackages: ['@rotra/ui', '@rotra/data', '@rotra/schema', '@rotra/db'],
}

export default nextConfig
