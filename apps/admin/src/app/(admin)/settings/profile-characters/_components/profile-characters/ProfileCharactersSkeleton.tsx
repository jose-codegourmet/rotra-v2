import { Skeleton } from '@rotra/ui/skeleton'

/**
 * A-CHARACTERS while the library loads: the upload zone and a grid of square images as grey bars,
 * with no count. Shared by loading.tsx and ProfileCharacters.
 */
export function ProfileCharactersSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <Skeleton label="Loading the profile characters" className="h-[120px] rounded-lg" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
        {Array.from({ length: 16 }, (_, index) => (
          <Skeleton key={`skeleton-${index}`} className="aspect-square h-auto rounded-[14px]" />
        ))}
      </div>
    </div>
  )
}
