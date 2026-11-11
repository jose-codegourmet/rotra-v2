import { Skeleton } from '@rotra/ui/skeleton'

/**
 * A-BANNERS while the library loads: the upload zone and a grid of wide 3:1 tiles as grey bars, with
 * no count. Shared by loading.tsx and ProfileBanners.
 */
export function ProfileBannersSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <Skeleton label="Loading the profile banners" className="h-[120px] rounded-lg" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={`skeleton-${index}`} className="aspect-[3/1] h-auto rounded-[14px]" />
        ))}
      </div>
    </div>
  )
}
