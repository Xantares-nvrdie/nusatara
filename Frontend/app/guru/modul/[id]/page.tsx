import { ModuleDetail } from '@/components/guru/module-detail'

export default async function ModulDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ModuleDetail id={id} />
}
