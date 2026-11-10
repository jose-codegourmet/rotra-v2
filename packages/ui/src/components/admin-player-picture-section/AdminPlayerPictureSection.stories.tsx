import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  type AdminPlayerPictureChoice,
  AdminPlayerPictureSection,
  type AdminPlayerPictureSectionProps,
  PICTURE_UPLOAD_ERRORS,
} from './AdminPlayerPictureSection'

// Placeholder faces: a flat tile whose hue follows its position.
const face = (n: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${(n * 47) % 360} 60% 55%)"/><circle cx="50" cy="42" r="20" fill="hsl(${(n * 47) % 360} 60% 85%)"/><rect x="22" y="68" width="56" height="40" rx="20" fill="hsl(${(n * 47) % 360} 60% 85%)"/></svg>`,
  )}`

const characters = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `ch${i + 1}`, image: face(i + 1), number: i + 1 }))

const photo: AdminPlayerPictureChoice = { kind: 'photo', src: face(90) }
const character = (n: number): AdminPlayerPictureChoice => ({
  kind: 'character',
  id: `ch${n}`,
  image: face(n),
})
const initials: AdminPlayerPictureChoice = { kind: 'initials' }

const meta = {
  title: 'Admin/AdminPlayerPictureSection',
  component: AdminPlayerPictureSection,
  args: {
    name: 'Mikee Abellana',
    picture: photo,
    savedPicture: photo,
    previousPicture: null,
    characters: characters(24),
    onUpload: () => {},
    onUseInitials: () => {},
    onUsePrevious: () => {},
    onPickCharacter: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminPlayerPictureSection>
export default meta
type Story = StoryObj<typeof meta>

/** Holds the draft like the form does, so picking, initials, previous and paging all respond. */
function Live(args: AdminPlayerPictureSectionProps & { startDraft?: AdminPlayerPictureChoice }) {
  const [draft, setDraft] = useState(args.startDraft ?? args.picture)
  return (
    <AdminPlayerPictureSection
      {...args}
      picture={draft}
      onUseInitials={() => setDraft(initials)}
      onUsePrevious={() => args.previousPicture && setDraft(args.previousPicture)}
      onPickCharacter={(id) => {
        const found = args.characters.find((item) => item.id === id)
        if (found) setDraft({ kind: 'character', id, image: found.image })
      }}
      onUpload={() => setDraft({ kind: 'photo', src: face(77) })}
    />
  )
}
const live = (args: Partial<AdminPlayerPictureSectionProps>): Story => ({
  render: (base) => <Live {...base} {...args} />,
})

export const Photo: Story = {}
export const PhotoLight: Story = { globals: { theme: 'light' } }
export const Character: Story = { args: { picture: character(3), savedPicture: character(3) } }
export const CharacterLight: Story = {
  args: { picture: character(3), savedPicture: character(3) },
  globals: { theme: 'light' },
}
export const Initials: Story = { args: { picture: initials, savedPicture: initials } }
export const InitialsLight: Story = {
  args: { picture: initials, savedPicture: initials },
  globals: { theme: 'light' },
}

export const ChangesWhenYouSave: Story = {
  args: { picture: character(5), savedPicture: photo },
}

export const WithPreviousPicture: Story = {
  args: { picture: character(3), savedPicture: character(3), previousPicture: photo },
}
export const WithPreviousPictureLight: Story = {
  args: { picture: character(3), savedPicture: character(3), previousPicture: photo },
  globals: { theme: 'light' },
}
export const WithPreviousCharacter: Story = {
  args: { picture: photo, savedPicture: photo, previousPicture: character(9) },
}
export const WithoutPreviousPicture: Story = { args: { previousPicture: null } }

/** A character already in use that the library no longer shows: it stays in the preview. */
export const CharacterNoLongerShown: Story = {
  args: {
    picture: { kind: 'character', id: 'gone', image: face(55) },
    savedPicture: { kind: 'character', id: 'gone', image: face(55) },
  },
}

export const ErrorWrongType: Story = { args: { error: PICTURE_UPLOAD_ERRORS.type } }
export const ErrorTooLarge: Story = { args: { error: PICTURE_UPLOAD_ERRORS.size } }
export const ErrorUnreadable: Story = {
  args: { error: PICTURE_UPLOAD_ERRORS.unreadable },
  globals: { theme: 'light' },
}

export const FewCharacters: Story = { args: { characters: characters(8) } }
export const PagedCharacters: Story = {
  args: { picture: character(10), savedPicture: character(10) },
}
export const PagedCharactersLight: Story = {
  args: { picture: character(10), savedPicture: character(10) },
  globals: { theme: 'light' },
}

export const Saving: Story = {
  args: {
    disabled: true,
    picture: character(3),
    savedPicture: character(3),
    previousPicture: photo,
  },
}
export const SavingLight: Story = {
  args: { disabled: true, previousPicture: character(9) },
  globals: { theme: 'light' },
}

export const Interactive: Story = {
  args: { previousPicture: character(9) },
  ...live({}),
}

export const Phone: Story = {
  args: { previousPicture: photo, picture: character(3), savedPicture: character(3) },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
export const PhoneLight: Story = {
  args: { previousPicture: photo, picture: character(3), savedPicture: character(3) },
  globals: { theme: 'light' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
