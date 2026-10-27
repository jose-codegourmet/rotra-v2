import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'

// Components import siblings through the package's own exports (`@rotra/ui/cn`), like the apps do.
// Map each export to its file so Vite resolves the self-references without a build step.
const pkgUrl = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { exports: Record<string, string> }
const selfAliases = Object.entries(pkg.exports)
  .sort(([a], [b]) => b.length - a.length)
  .map(([subpath, file]) => ({
    find: `@rotra/ui/${subpath.slice(2)}`,
    replacement: fileURLToPath(new URL(`../${file.slice(2)}`, import.meta.url)),
  }))

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()]
    const existing = viteConfig.resolve?.alias ?? []
    const existingList = Array.isArray(existing)
      ? existing
      : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }))
    viteConfig.resolve = { ...viteConfig.resolve, alias: [...existingList, ...selfAliases] }
    return viteConfig
  },
}

export default config
