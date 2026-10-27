import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias:
      process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ROTRA_DEV_MENU !== '1'
        ? { '@/providers/DevTools': './src/providers/DisabledDevTools.tsx' }
        : {},
  },
  // Workspace packages ship TypeScript source, not built files
  transpilePackages: ['@rotra/ui', '@rotra/data', '@rotra/schema'],
}

export default nextConfig
