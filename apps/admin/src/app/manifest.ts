import type { MetadataRoute } from 'next'

// Web app manifest (served at /manifest.webmanifest). Icons are Higgsfield art; sources in
// docs/branding/materials/app-icons. Colours match the dark theme's base background.
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ROTRA Admin',
    short_name: 'Admin',
    description: 'Platform owner tools: clubs, licenses, players and configuration.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
