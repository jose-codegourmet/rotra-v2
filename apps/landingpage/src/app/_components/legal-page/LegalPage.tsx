import type { LegalDocumentProps } from './legal-document'

type LegalPageProps = {
  /** The hash route this page answers to (`privacy`, `terms`). */
  view: string
  doc: LegalDocumentProps
  /** The other legal document, linked at the end. */
  other: { href: string; label: string }
}

/** `privacy-your-rights`: the view, then the heading. Never equal to a route name, so the router reads it as an anchor. */
function sectionId(view: string, heading: string) {
  return `${view}-${heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

/** A legal page (#privacy, #terms): text only, one readable column. */
export function LegalPage({ view, doc, other }: LegalPageProps) {
  return (
    <main className="view legal gut" data-view={view} hidden>
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
          <a href="#home">Back to home</a>
        </p>
      </article>
    </main>
  )
}
