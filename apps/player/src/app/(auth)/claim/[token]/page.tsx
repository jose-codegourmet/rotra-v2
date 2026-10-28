import { Claim } from './_components/claim/Claim'
export default async function Page(props: PageProps<'/claim/[token]'>) {
  const [{ token }, { opened }] = await Promise.all([props.params, props.searchParams])
  // The dev menu reopens the same link with ?opened=…, which must start from the first step again.
  return <Claim key={`${token}:${opened ?? ''}`} token={token} />
}
