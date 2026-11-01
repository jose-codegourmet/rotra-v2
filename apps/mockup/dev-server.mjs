import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const root = new URL('./', import.meta.url)
const products = ['player', 'queue', 'admin']
const assets = new Map([
  ['/index.css', ['index.css', 'text/css']],
  ['/router.js', ['router.js', 'text/javascript']],
])
const port = Number(process.env.PORT || 9003)

createServer(async (request, response) => {
  const send = (status, type, body) => {
    response.writeHead(status, {
      'Content-Type': `${type}; charset=utf-8`,
      'Cache-Control': 'no-store',
    })
    response.end(request.method === 'HEAD' ? undefined : body)
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD')
    send(405, 'text/plain', 'Method not allowed')
    return
  }
  try {
    const url = new URL(request.url, 'http://localhost')
    const path = url.pathname
    const product = products.find((name) => path === `/${name}` || path.startsWith(`/${name}/`))
    const legacy = products.find((name) => path === `/${name}-app/rotra-${name}.html`)
    if (legacy || (product && path.endsWith('/'))) {
      response.writeHead(302, {
        Location: `${legacy ? `/${legacy}` : path.replace(/\/+$/, '')}${url.search}`,
      })
      response.end()
      return
    }
    if (path === '/' || path === '/index.html') {
      send(200, 'text/html', await readFile(new URL('index.html', root), 'utf8'))
      return
    }
    if (assets.has(path)) {
      const [file, type] = assets.get(path)
      send(200, type, await readFile(new URL(file, root)))
      return
    }
    if (product) {
      const file = new URL(`${product}-app/rotra-${product}.html`, root)
      const html = await readFile(file, 'utf8')
      // The canonical HTML also works standalone. Routing is enabled only here.
      send(
        200,
        'text/html',
        html.replace('<script>', '<script src="/router.js"></script>\n<script>'),
      )
      return
    }
    send(404, 'text/plain', 'Prototype route not found. Open / to choose an app.')
  } catch (error) {
    console.error(error)
    send(500, 'text/plain', 'Unable to load the prototype.')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`ROTRA prototypes: http://127.0.0.1:${port}`)
  console.log(`Source: ${fileURLToPath(root)}`)
})
