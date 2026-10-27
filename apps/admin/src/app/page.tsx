// Placeholder until the product screens land. The swatches check the theme tokens against the
// prototype in both themes (use the toggle).
import { ThemeToggle } from '@rotra/ui/theme-toggle'

const SWATCHES = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['elev', 'bg-elev'],
  ['overlay', 'bg-overlay'],
  ['fg', 'bg-fg'],
  ['fg2', 'bg-fg2'],
  ['fg3', 'bg-fg3'],
  ['accent', 'bg-accent'],
  ['accent-subtle', 'bg-accent-subtle'],
  ['warn', 'bg-warn'],
  ['error', 'bg-error'],
  ['border-strong', 'bg-border-strong'],
] as const

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1>
          ROTRA <span className="text-accent">Admin</span>
        </h1>
        <ThemeToggle />
      </div>
      <p className="text-fg2">Platform owner tools: clubs, licenses, players and configuration.</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {SWATCHES.map(([name, className]) => (
          <li
            key={name}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-card"
          >
            <span className={`h-12 rounded-md border border-border-strong ${className}`} />
            <span className="font-mono text-[13px]">{name}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
