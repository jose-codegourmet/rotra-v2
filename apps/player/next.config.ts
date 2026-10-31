import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias:
      process.env.NODE_ENV === 'production'
        ? { '@/providers/DevTools': './src/providers/DisabledDevTools.tsx' }
        : {},
  },
  // Workspace packages ship TypeScript source, not built files
  transpilePackages: ['@rotra/ui', '@rotra/data', '@rotra/schema', '@rotra/db'],
}

export default nextConfig
