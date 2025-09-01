'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import styles from './TicketsList.module.css'

export default function TicketsListClient({ initialTickets }: { initialTickets: any[] }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function updateStatus(ticketId: string, newStatus: string) {
    try {
      setLoadingId(ticketId)

      const res = await fetch(`/api/app-my-tickets?ticketId=${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update')

      setTickets((prev) =>
        prev.map((t) =>
          (t.id || t._id) === ticketId
            ? { ...t, status: data.ticket.status, updatedAt: data.ticket.updatedAt }
            : t,
        ),
      )
    } catch (err) {
      console.error('Failed to update status', err)
      alert('Error updating status')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      {tickets.length === 0 ? (
        <p className={styles.empty}>No tickets found</p>
      ) : (
        <ul className={styles.list}>
          {tickets.map((t: any) => {
            const id = t?.id || t?._id
            return (
              <li key={id || t.title} className={styles.listItem}>
                {id ? (
                  <a href={`/tickets/${id}`} className={styles.link}>
                    <div className={styles.itemHeader}>
                      <div>
                        <p className={styles.title}>{t.title}</p>
                        <p className={styles.meta}>
                          {t.priority?.toUpperCase()} • {String(t.status).replace('_', ' ')}
                        </p>
                      </div>
                      <div className={styles.timestamp}>
                        {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className={styles.link}>
                    <div className={styles.itemHeader}>
                      <div>
                        <p className={styles.title}>{t.title}</p>
                        <p className={styles.meta}>
                          {t.priority?.toUpperCase()} • {String(t.status).replace('_', ' ')}
                        </p>
                      </div>
                      <div className={styles.timestamp}>
                        {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
