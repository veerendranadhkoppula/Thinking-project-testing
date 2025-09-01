/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionConfig } from 'payload' //, Access

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      ({ req, data, originalDoc, operation }) => {
        const u: any = req.user
        // console.log(req.user)
        if (operation === 'create') {
          if (u?.id) data.reporter = u.id
          if (!data.priority) data.priority = 'medium'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
      ],
    },

    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
    },

    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'site-users',
      required: true,
      hooks: {
        beforeChange: [({ req, value }) => (req.user ? (req.user as any).id : value)],
      },
    },

    { name: 'assignee', type: 'relationship', relationTo: 'site-users' },
    { name: 'attachments', type: 'relationship', relationTo: 'media', hasMany: true },
    { name: 'labels', type: 'array', fields: [{ name: 'value', type: 'text' }] },
    { name: 'url', type: 'text', admin: { description: 'Page URL where the issue occurred' } },
  ],
  timestamps: true,
}
