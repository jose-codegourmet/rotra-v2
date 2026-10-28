import { Inventory } from './_components/inventory/Inventory'

export default async function InventoryPage(props: PageProps<'/inventory'>) {
  const search = await props.searchParams
  return <Inventory fromSetup={search.from === 'setup'} />
}
