import { readShownProfileCharacters } from '@rotra/db/admin/profile-characters'
import { handlePublicRead } from '@rotra/db/service/handler'

/** The Player picture picker: shown library images only, in upload order. */
export async function GET() {
  return handlePublicRead('profile-character.shown', async () => ({
    body: { characters: await readShownProfileCharacters() },
  }))
}
