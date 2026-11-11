import { Skeleton } from '@rotra/ui/skeleton'
import { ProfileBannersSkeleton } from './_components/profile-banners/ProfileBannersSkeleton'

/** A-BANNERS while the route loads: header, upload zone and the banner grid as grey bars. */
export default function ProfileBannersLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="w-96 max-w-full" />
      </div>
      <ProfileBannersSkeleton />
    </>
  )
}
