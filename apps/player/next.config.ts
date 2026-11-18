import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias:
      process.env.NODE_ENV === 'production'
        ? { '@/providers/DevTools': './src/providers/DisabledDevTools.tsx' }
        : {},
  },
  // /card/<RTR ID> (the profile card for rotra.club's "Find your profile") may be framed by the landing
  // site only: production, and the local landing dev server.
  async headers() {
    return [
      {
        source: '/card/:rtrId',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              'frame-ancestors https://rotra.club https://www.rotra.club http://localhost:9004',
          },
        ],
      },
    ]
  },
  // Workspace packages ship TypeScript source, not built files
  transpilePackages: ['@rotra/ui', '@rotra/data', '@rotra/schema', '@rotra/db', '@rotra/api-proxy'],
}

export default nextConfig
