import { clubPlayers } from '@rotra/data/fixtures/players'
import { AlphabetIndex } from '@rotra/ui/alphabet-index'
import { SavedPlayerCard } from '@rotra/ui/saved-player-card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LetterGroup, letterHeadingId } from './LetterGroup'

const letterOf = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}
const grouped = new Map<string, typeof clubPlayers>()
for (const p of [...clubPlayers].sort((a, b) => a.fullName.localeCompare(b.fullName))) {
  const letter = letterOf(p.fullName)
  grouped.set(letter, [...(grouped.get(letter) ?? []), p])
}
const groups = [...grouped].sort(
  ([a], [b]) => Number(a === '#') - Number(b === '#') || a.localeCompare(b),
)

function Directory() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="flex flex-col gap-[18px]">
        {groups.map(([letter, list]) => (
          <LetterGroup key={letter} letter={letter} count={list.length}>
            {list.map((p) => (
              <SavedPlayerCard
                key={p.id}
                name={p.fullName}
                nickname={p.nickname}
                identity={p.identity}
                level={p.playingLevel}
                registeredCity={null}
                sessionsHere={0}
                addedLabel="Oct 3"
                onOpenProfile={fn()}
                onInvite={fn()}
              />
            ))}
          </LetterGroup>
        ))}
      </div>
      <AlphabetIndex
        available={groups.map(([letter]) => letter)}
        onJump={(letter) => {
          const heading = document.getElementById(letterHeadingId(letter))
          heading?.scrollIntoView({ block: 'start' })
          heading?.focus({ preventScroll: true })
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Queue/LetterGroup',
  component: LetterGroup,
  args: { letter: 'M', count: 2, children: null },
} satisfies Meta<typeof LetterGroup>

export default meta
type Story = StoryObj<typeof meta>

export const DirectoryWithIndex: Story = { render: () => <Directory /> }
export const Phone: Story = {
  render: () => <Directory />,
  globals: { viewport: { value: 'phone' } },
}
