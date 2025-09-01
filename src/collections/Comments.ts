/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: 'ticket', type: 'relationship', relationTo: 'tickets', required: true },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'site-users',
      required: true,
      hooks: {
        beforeChange: [({ req, value }) => (req.user ? (req.user as any).id : value)],
      },
    },
    { name: 'body', type: 'textarea', required: true },
    { name: 'attachments', type: 'relationship', relationTo: 'media', hasMany: true },
  ],
  timestamps: true,
}
