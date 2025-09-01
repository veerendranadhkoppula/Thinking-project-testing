import { CollectionConfig } from 'payload'

const Website: CollectionConfig = {
  slug: 'Website',
  labels: { singular: 'Website', plural: 'Website' },
  admin: { group: 'Canvas' },
  access: { read: () => true },
  fields: [
    { name: 'title', type: 'text', admin: { position: 'sidebar' }, required: true },
    {
      name: 'url',
      label: { singular: 'URL', plural: 'URL' },
      admin: { position: 'sidebar' },
      required: true,
      type: 'text',
    },
    {
      name: 'admins',
      type: 'array',
      fields: [{ name: 'admin', label: 'Admin Email', type: 'email', required: true }],
    },
    {
      name: 'editors',
      type: 'array',
      fields: [{ name: 'editor', type: 'email' }],
    },
    {
      name: 'guests',
      type: 'array',
      fields: [{ name: 'guest', type: 'email' }],
    },
    {
      name: 'enableDefaultViewports',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enable Default Viewports',
    },
    {
      name: 'viewports',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'orientation', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'type',
      type: 'group',
      admin: { position: 'sidebar' },
      fields: [
        {
          name: 'mediaType',
          type: 'select',
          required: true,
          options: ['Website', 'Figma', 'Image', 'Video', 'PDF'],
          defaultValue: 'Website',
        },
        {
          name: 'injectionType',
          type: 'select',
          required: true,
          options: ['Proxy', 'Extension', 'Manual'],
        },
      ],
    },
    {
      name: 'versions',
      type: 'array',
      fields: [
        {
          name: 'page-links',
          type: 'array',
          fields: [
            { name: 'page-link', type: 'text', required: true },
            { name: 'roomId', type: 'text', required: true },
            {
              name: 'thread',
              type: 'array',
              fields: [
                { name: 'thread-id', type: 'text' },
                { name: 'viewport', type: 'text' },
                { name: 'viewport-Orientation', type: 'checkbox', defaultValue: false },
                {
                  name: 'comments',
                  type: 'array',
                  fields: [
                    { name: 'comment-id', type: 'text' },
                    { name: 'author', type: 'text' },
                    { name: 'authorEmail', type: 'email' },
                    { name: 'date', type: 'date' },
                    { name: 'edited', type: 'checkbox', defaultValue: false },
                    { name: 'editedAt', type: 'date' },
                    { name: 'deleted', type: 'checkbox', defaultValue: false },
                    {
                      name: 'commentType',
                      type: 'select',
                      options: ['comment', 'task'],
                      defaultValue: 'comment',
                    },
                    {
                      name: 'commentStatus',
                      type: 'select',
                      options: ['completed', 'active'],
                      defaultValue: 'active',
                    },
                    {
                      name: 'ping',
                      type: 'group',
                      fields: [
                        { name: 'x', type: 'number' },
                        { name: 'y', type: 'number' },
                        { name: 'height', type: 'number' },
                        { name: 'width', type: 'number' },
                      ],
                    },
                    { name: 'text-edited', type: 'checkbox', defaultValue: false },
                    {
                      name: 'text-edit',
                      type: 'group',
                      fields: [
                        { name: 'selector', type: 'text' },
                        { name: 'oldText', type: 'text' },
                        { name: 'newText', type: 'text' },
                      ],
                    },
                    { name: 'message', type: 'textarea' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ operation, data }) => {
        if (operation === 'create') {
          // console.log('============================= PAYLOAD ==========================', data)
          const adminEmail = data?.admins?.[0]?.admin?.trim()
          const rawUrl = data?.url?.trim()

          if (!adminEmail || !rawUrl) {
            throw new Error('Admin email and URL are required to generate roomId')
          }

          let domain: string
          try {
            const parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
            domain = parsedUrl.host
          } catch {
            throw new Error('Invalid URL format')
          }

          const readableRoomId = `${adminEmail}/${domain}/#1`
          data.versions = [
            {
              'page-links': [{ 'page-link': rawUrl, roomId: readableRoomId, thread: [] }],
            },
          ]
        }
        return data
      },
    ],
  },
}

export default Website
