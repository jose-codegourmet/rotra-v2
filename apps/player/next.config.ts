import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source, not built files
  transpilePackages: ['@rotra/ui', '@rotra/data', '@rotra/schema'],
}

export default nextConfig
