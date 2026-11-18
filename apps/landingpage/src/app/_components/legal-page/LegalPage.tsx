import { LogoDefs } from '@/app/_components/logo-defs/LogoDefs'
import type { LegalDocumentProps } from './legal-document'

type LegalPageProps = {
  /** The page's path without the slash (`privacy`, `terms`); also the prefix of its section ids. */
  view: string
  doc: LegalDocumentProps
  /** The other legal document, linked at the end. */
  other: { href: string; label: string }
}

/** `privacy-your-rights`: the page, then the heading. */
function sectionId(view: string, heading: string) {
  return `${view}-${heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

/**
 * A legal page (/privacy, /terms): a page of its own with its own URL, text only, one readable column.
 * It runs no page scripts and has no loading screen, so the text is there for a reader or a crawler without
 * JavaScript. Its links back into the site are full page loads (`/`, `/#ranking`).
 */
export function LegalPage({ view, doc, other }: LegalPageProps) {
  return (
    <>
      <LogoDefs />
      <header className="top gut">
        <div className="wrap">
          {/* biome-ignore lint/a11y/useAnchorContent: the aria-label names the logo link */}
          <a className="rlogo" href="/" aria-label="ROTRA home">
            <svg aria-hidden="true">
              <use href="#logo-full" />
            </svg>
          </a>
          <nav aria-label="Main">
            <a href="/#ranking">How ranking works</a>
            <a href="/#clubs">For clubs</a>
            <a href="/#find">Find your profile</a>
            <a className="btn pri" href="https://player.rotra.club/login">
              Sign in
            </a>
          </nav>
        </div>
      </header>
      <main className="legal gut">
        <article className="legal-doc">
          <header className="legal-head">
            <h1>{doc.title}</h1>
            <p className="legal-eff">{doc.effective}</p>
          </header>
          {doc.sections.map((section) => {
            const id = sectionId(view, section.heading)
            return (
              <section key={id} aria-labelledby={id}>
                <h2 id={id}>{section.heading}</h2>
                {section.blocks.map((block) =>
                  block.kind === 'paragraph' ? (
                    <p key={block.text}>{block.text}</p>
                  ) : (
                    <ul key={block.items.join('|')}>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            )
          })}
          <p className="legal-more">
            <a href={other.href}>{other.label}</a>
            {' · '}
            <a href="/">Back to home</a>
          </p>
        </article>
      </main>
    </>
  )
}
