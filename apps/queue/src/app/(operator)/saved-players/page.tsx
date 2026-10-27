import { Suspense } from 'react'
import { SavedPlayers } from './_components/saved-players/SavedPlayers'

export default function SavedPlayersPage() {
  return (
    <Suspense>
      <SavedPlayers />
    </Suspense>
  )
}
