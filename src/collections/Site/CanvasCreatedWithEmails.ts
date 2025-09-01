import type { CollectionConfig } from 'payload'

const CanvasCreatedWithEmails: CollectionConfig = {
  slug: 'canvas-created-with-emails',
  admin: { useAsTitle: 'email' },
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: 'email', type: 'email', unique: true, required: true },
    {
      name: 'canvases',
      type: 'relationship',
      relationTo: ['Website'],
      hasMany: true,
    },
  ],
}

export default CanvasCreatedWithEmails
