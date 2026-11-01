import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
  'dev-server.mjs',
  'router.js',
  'index.html',
  'index.css',
  'player-app',
  'queue-app',
  'admin-app',
]) {
  await cp(new URL(file, root), new URL(file, output), { recursive: true })
}
// Vercel serves static files; only local development needs the Node HTTP server.
const publicOutput = new URL('public/', output)
await mkdir(publicOutput, { recursive: true })
for (const file of ['index.html', 'index.css', 'router.js']) {
  await cp(new URL(file, root), new URL(file, publicOutput))
}
for (const product of ['player', 'queue', 'admin']) {
  const file = `${product}-app/rotra-${product}.html`
  const html = await readFile(new URL(file, root), 'utf8')
  await mkdir(new URL(`${product}-app/`, publicOutput), { recursive: true })
  await writeFile(
    new URL(file, publicOutput),
    html.replace('<script>', '<script src="/router.js"></script>\n<script>'),
  )
}
console.log('Built static prototypes in dist/public/. Local bundle: node dist/dev-server.mjs')
