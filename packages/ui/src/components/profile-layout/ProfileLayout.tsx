import type { ReactNode } from 'react'
export type ProfileLayoutProps = { side: ReactNode; main: ReactNode }
export function ProfileLayout({ side, main }: ProfileLayoutProps) {
  return (
    <main className="mx-auto max-w-[1240px] px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px]">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[920px]:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5 min-[920px]:sticky min-[920px]:top-[calc(73px+env(safe-area-inset-top,0px))]">
          {side}
        </aside>
        <div className="flex min-w-0 flex-col gap-5">{main}</div>
      </div>
    </main>
  )
}
