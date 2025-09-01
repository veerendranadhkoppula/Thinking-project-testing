import TicketsList from './TicketsList'
import { requireAuth } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TicketsPage() {
  await requireAuth('/tickets')
  return (
    <div className="p-6">
      <TicketsList />
    </div>
  )
}
