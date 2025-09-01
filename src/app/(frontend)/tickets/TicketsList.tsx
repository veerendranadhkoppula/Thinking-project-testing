import configPromise from '@/payload.config'
import payload from 'payload'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'
import TicketsListClient from './TicketList_Client'
import styles from './TicketsList.module.css'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getTickets() {
  const config = await configPromise
  await payload.init({ config })

  const session = await getServerSession(authOptions)
  const userEmail = session?.user?.email
  if (!userEmail) {
    throw new Error('Unauthenticated')
  }

  const users = await payload.find({
    collection: 'site-users',
    where: { email: { equals: userEmail } },
    limit: 1,
  })

  if (!users.docs[0]) {
    throw new Error('User not found')
  }
  const userId = users.docs[0].id
  const tickets = await payload.find({
    collection: 'tickets',
    where: {
      or: [{ reporter: { equals: userId } }, { assignee: { equals: userId } }],
    },
    sort: '-updatedAt',
    limit: 50,
  })
  return tickets.docs
}

export default async function TicketsList() {
  const tickets = await getTickets()

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Tickets</h1>
      <Link href="/tickets/new" className={styles.newButton}>
        New Ticket
      </Link>
      <TicketsListClient initialTickets={tickets} />
    </div>
  )
}
