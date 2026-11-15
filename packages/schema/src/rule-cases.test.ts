import { describe, expect, it } from 'vitest'
import { commandCaseFile, ruleCaseFile, ruleCaseJsonSchemas } from './rule-cases'

// Vite reads the JSON in the sibling `@rotra/rule-cases` package (a devDependency, so Turborepo
// hashes it for this test). Relative paths because the files are data, not importable code.
declare global {
  interface ImportMeta {
    glob(pattern: string, options: { eager: true; import: 'default' }): Record<string, unknown>
  }
}
const caseFiles = import.meta.glob('../../rule-cases/cases/**/*.json', {
    eager: true,
    import: 'default',
  }),
  schemaFiles = import.meta.glob('../../rule-cases/schema/*.json', {
    eager: true,
    import: 'default',
  })
const AREAS = ['match', 'courts', 'roster', 'courtfill']

describe('rule cases package', () => {
  it('holds case files', () => {
    expect(Object.keys(caseFiles).length).toBeGreaterThan(0)
  })

  it('commits the JSON Schemas the Zod shapes generate', () => {
    for (const [file, schema] of Object.entries(ruleCaseJsonSchemas))
      expect(schemaFiles[`../../rule-cases/schema/${file}`], file).toEqual(
        JSON.parse(JSON.stringify(schema)),
      )
  })

  describe.each(Object.entries(caseFiles))('%s', (path, content) => {
    const parts = path.split('/cases/')[1]?.split('/') ?? []
    const [versionDir, area, fileName] = parts

    it('sits at cases/v<n>/<area>/<name>.json', () => {
      expect(parts).toHaveLength(3)
      expect(versionDir).toMatch(/^v[1-9]\d*$/)
      expect(AREAS).toContain(area)
      expect(fileName).toMatch(/^[A-Za-z][A-Za-z0-9_]*\.json$/)
    })

    it('matches the schema and names itself by its path', () => {
      const kind = (content as { kind?: string }).kind
      const parsed =
        kind === 'command' ? commandCaseFile.safeParse(content) : ruleCaseFile.safeParse(content)
      expect(parsed.error?.issues ?? []).toEqual([])
      if (!parsed.success) return
      const file = parsed.data
      expect(`v${file.version}`).toBe(versionDir)
      expect(
        `${kind === 'command' ? (file as { command: string }).command : (file as { rule: string }).rule}.json`,
      ).toBe(fileName)
      const names = file.cases.map((c) => c.name)
      expect(new Set(names).size, 'case names are unique').toBe(names.length)
    })
  })
})
