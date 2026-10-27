import type { Meta, StoryObj } from '@storybook/react-vite'

const GROUPS = [
  {
    title: 'Surfaces',
    tokens: ['bg', 'surface', 'elev', 'overlay', 'field'],
  },
  {
    title: 'Text',
    tokens: ['fg', 'fg2', 'fg3', 'on-accent'],
  },
  {
    title: 'Accent and states',
    tokens: [
      'accent',
      'accent-dim',
      'accent-subtle',
      'warn',
      'warn-subtle',
      'error',
      'error-subtle',
    ],
  },
  {
    title: 'Lines',
    tokens: ['border', 'border-strong', 'scrim'],
  },
  {
    title: 'Court',
    tokens: ['court', 'court-line', 'court-free', 'court-free-line'],
  },
  {
    title: 'Player Information',
    tokens: ['gold', 'silver', 'bronze', 'qr-bg', 'qr-fg'],
  },
] as const

function Swatch({ token }: { token: string }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-card">
      <span
        className="h-12 rounded-md border border-border-strong"
        style={{ background: `var(--${token})` }}
      />
      <span className="font-mono text-[13px]">{token}</span>
    </li>
  )
}

function Tokens() {
  return (
    <div className="flex flex-col gap-6 bg-bg p-4 text-fg">
      <div className="flex flex-col gap-1">
        <h1>Tokens</h1>
        <p className="text-fg2">
          Copied from the prototypes. Switch the Theme toolbar to compare dark and light.
        </p>
      </div>
      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2>{group.title}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {group.tokens.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </ul>
        </section>
      ))}
      <section className="flex flex-col gap-3">
        <h2>Type</h2>
        <p className="font-sans text-[15px]">Manrope 15 / 1.5: Run the game.</p>
        <p className="font-mono">JetBrains Mono: RTR-PH-CEB-031526-0001</p>
        <p className="font-pixel text-accent">SILKSCREEN PODIUM</p>
      </section>
    </div>
  )
}

const meta = {
  title: 'Shared/Tokens',
  component: Tokens,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Tokens>

export default meta

export const All: StoryObj<typeof meta> = {}
