import { Skeleton } from '@rotra/ui/skeleton'
import { RankingSettingsSkeleton } from './_components/ranking-settings/RankingSettingsSkeleton'

/** A-RANK-CONFIG while the route loads: header and both columns as grey bars. */
export default function RankingSettingsLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="w-3/4" />
      </div>
      <RankingSettingsSkeleton />
    </>
  )
}
