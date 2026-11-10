import { Skeleton } from '@rotra/ui/skeleton'
import { ProfileCharactersSkeleton } from './_components/profile-characters/ProfileCharactersSkeleton'

/** A-CHARACTERS while the route loads: header, upload zone and the image grid as grey bars. */
export default function ProfileCharactersLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="w-96 max-w-full" />
      </div>
      <ProfileCharactersSkeleton />
    </>
  )
}
