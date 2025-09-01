import NewTicketForm from '../NewTicketForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function NewTicketPage() {
  return (
    <div className="p-6">
      <NewTicketForm />
    </div>
  )
}
