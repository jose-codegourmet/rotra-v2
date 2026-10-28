import { PublicPagePreview } from './_components/public-page-preview/PublicPagePreview'

export default async function PublicPagePreviewPage(
  props: PageProps<'/sessions/[sessionId]/public-page'>,
) {
  const { sessionId } = await props.params
  return <PublicPagePreview sessionId={sessionId} />
}
