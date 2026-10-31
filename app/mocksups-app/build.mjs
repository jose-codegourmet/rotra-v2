import { cp, mkdir, readFile, rm } from 'node:fs/promises'
import { Script } from 'node:vm'

const root = new URL('./', import.meta.url)
const output = new URL('dist/', root)
// Validate the inline prototype programs as well as the routing/server files.
for (const product of ['player', 'queue', 'admin']) {
  const file = `${product}-app/rotra-${product}.html`
  const html = await readFile(new URL(file, root), 'utf8')
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    new Script(match[1], { filename: file })
  }
}
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
for (const file of [
  'server.mjs',
  'router.js',
  'index.html',
  'index.css',
  'player-app',
  'queue-app',
  'admin-app',
]) {
  await cp(new URL(file, root), new URL(file, output), { recursive: true })
}
console.log('Built routed prototypes in dist/. Run: node dist/server.mjs')
