import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'))
const names = ['mockup', 'queue', 'player', 'admin']
assert.deepEqual(Object.keys(config.services).sort(), [...names].sort())
for (const name of names) {
  assert.equal(config.services[name].root, `apps/${name}`)
  await access(new URL(`apps/${name}/package.json`, root))
  const route = config.rewrites.find((rule) =>
    rule.has?.some(
      (condition) => condition.type === 'host' && condition.value === `${name}.rotra.club`,
    ),
  )
  assert.equal(route?.source, '/(.*)')
  assert.equal(route?.destination.service, name)
}
assert.equal(config.services.mockup.outputDirectory, 'dist/public')
assert.equal(config.git.deploymentEnabled, false)

// Run after vercel pull: prevent deploying service roots relative to a single-app project.
if (process.argv.includes('--linked')) {
  const project = JSON.parse(await readFile(new URL('.vercel/project.json', root), 'utf8'))
  assert.equal(project.projectId, process.env.VERCEL_PROJECT_ID)
  assert.equal(project.orgId, process.env.VERCEL_ORG_ID)
  assert.equal(
    project.settings?.framework,
    'services',
    'Set the Vercel project preset to Services.',
  )
  assert.ok(
    [undefined, null, '', '.'].includes(project.settings?.rootDirectory),
    'Set the Vercel project Root Directory to the repository root (./).',
  )
}
console.log('Verified four Vercel services and their production host routes.')
