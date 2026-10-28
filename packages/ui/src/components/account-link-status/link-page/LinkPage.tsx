import type { ReactNode } from 'react'
export type LinkPageProps = {
  /** Small caps line above the title, e.g. 'Registration link from Lahug Smash Club' */
  label?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}
/** The prototype's slim registration-link page: label, heading, then the step's content. */
export function LinkPage({ label, title, description, children }: LinkPageProps) {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))]">
      <div className="flex flex-col gap-1.5">
        {label ? (
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase [overflow-wrap:anywhere]">
            {label}
          </span>
        ) : null}
        <h1 className="[overflow-wrap:anywhere]">{title}</h1>
        {description ? <p className="m-0 text-fg2">{description}</p> : null}
      </div>
      {children}
    </main>
  )
}
