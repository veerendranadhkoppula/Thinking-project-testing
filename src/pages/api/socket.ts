// src/pages/api/socket.ts
import { Server } from 'socket.io'

function getUsersInRoom(roomId: string, io: any) {
  const usersSet = new Set<string>()

  const room = io.sockets.adapter.rooms.get(roomId)
  if (!room) return []

  for (const sid of room) {
    const socket = io.sockets.sockets.get(sid)
    if (socket?.data.userName) {
      usersSet.add(socket.data.userName)
    }
  }

  return Array.from(usersSet)
}

export default function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    // console.log('🚀 Starting Socket.IO server...')

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: { origin: '*' },
    })

    io.on('connection', (socket) => {
      // console.log('✅ [Connect] Socket connected:', socket.id)

      socket.on('join-room', (roomId: string, userName: string) => {
        socket.join(roomId)
        socket.data.roomId = roomId
        socket.data.userName = userName

        const users = getUsersInRoom(roomId, io)
        // console.log(`📡 [Presence] Users in room ${roomId}:`, users)
        io.to(roomId).emit('presence:update', users)
      })

      // Thread
      socket.on('thread:add', ({ roomId, thread }) => {
        console.log(`[Socket] 🧵 thread:add | room=${roomId}`, thread)
        io.to(roomId).emit('thread:added', thread)
      })

      socket.on('comment:delete', ({ roomId, threadId, commentId }) => {
        // console.log(
        //   `[Socket] 🗑️ comment:delete | room=${roomId}, thread=${threadId}, commentId=${commentId},`,
        // )
        io.to(roomId).emit('comment:deleted', { threadId, commentId })
      })

      // 💬 Comment events
      socket.on('comment:add', ({ roomId, threadId, comment }) => {
        const normalized = { ...comment, 'comment-id': comment['comment-id'] ?? comment.id }
        // console.log(`[Socket] Add comment:add | room=${roomId}, thread=${threadId}`)
        // console.log('[Socket] Payload:', normalized)
        io.to(roomId).emit('comment:added', { threadId, comment: normalized })
      })

      socket.on('comment:reply', ({ roomId, threadId, reply }) => {
        const normalized = { ...reply, 'comment-id': reply['comment-id'] ?? reply.id }
        // console.log(`[Socket] ↩️ comment:reply | room=${roomId}, thread=${threadId}`)
        // console.log('[Socket] Payload:', normalized)
        io.to(roomId).emit('comment:replied', { threadId, reply: normalized })
      })

      socket.on('comment:edit', ({ roomId, threadId, commentId, message }) => {
        // console.log(
        // `[Socket] ✏️ comment:edit | room=${roomId}, thread=${threadId}, commentId=${commentId}`,
        // )
        // console.log('[Socket] New message:', message)
        io.to(roomId).emit('comment:edited', { threadId, commentId, message })
      })

      socket.on('disconnect', (reason) => {
        const { roomId, userName } = socket.data
        if (!roomId || !userName) return // skip sockets that never joined

        const users = getUsersInRoom(roomId, io)
        // console.log(`📡 [Presence] Updated users in room ${roomId}:`, users)
        io.to(roomId).emit('presence:update', users)
      })
    })

    res.socket.server.io = io
  }
  res.end()
}
