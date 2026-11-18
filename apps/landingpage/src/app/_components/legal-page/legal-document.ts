/**
 * A legal document (Privacy Policy, Terms of Service): the same shape as the Player Information app's
 * `LegalDocumentProps` (`@rotra/ui/legal-document`), kept local because this site does not use `@rotra/ui`.
 */
export type LegalDocumentProps = {
  title: string
  effective: string
  sections: {
    heading: string
    blocks: ({ kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] })[]
  }[]
}
