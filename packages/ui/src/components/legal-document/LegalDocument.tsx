import { PageHeader } from '@rotra/ui/page-header'

/** One block of a section: a paragraph, or a bulleted list. */
export type LegalBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] }

export type LegalSection = {
  /** Section heading, e.g. "Who we are" */
  heading: string
  blocks: LegalBlock[]
}

export type LegalDocumentProps = {
  /** Page title, e.g. "Privacy Policy" */
  title: string
  /** Line under the title, e.g. "Effective November 17, 2026" */
  effective: string
  sections: LegalSection[]
}

/**
 * P-PRIVACY / P-TERMS: a static legal page in a readable column (about 720 px). The page head holds
 * the title and the effective date; each section is a heading with paragraphs and lists.
 */
export function LegalDocument({ title, effective, sections }: LegalDocumentProps) {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-5 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))]">
      <PageHeader title={title} description={effective} />
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2.5">
          <h2>{section.heading}</h2>
          {section.blocks.map((block, index) =>
            block.kind === 'paragraph' ? (
              <p key={index} className="m-0">
                {block.text}
              </p>
            ) : (
              <ul key={index} className="m-0 flex list-disc flex-col gap-1.5 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </main>
  )
}
