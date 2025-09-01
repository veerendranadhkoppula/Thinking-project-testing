export const config = { runtime: 'nodejs' }
// app/api/socket-io/connection/route.ts
import { NextRequest } from 'next/server'
import { Server as IOServer } from 'socket.io'

declare global {
  var io: IOServer | undefined
}

export async function GET(req: NextRequest) {
  // @ts-ignore - only works in Node runtime, not Edge
  const server = (req as any)?.socket?.server

  if (!server) {
    return new Response('No server found', { status: 500 })
  }

  // Prevent re-creating on hot reload
  if (!global.io) {
    const io = new IOServer(server, {
      path: '/api/socket-io/connection', // ✅ keep path consistent
      addTrailingSlash: false,
      cors: { origin: '*' },
    })

    io.on('connection', (socket) => {
      // console.log('✅ User connected:', socket.id)

      socket.on('join-room', (roomId: string, userName: string) => {
        socket.join(roomId)
        // console.log(`👤 ${userName} joined ${roomId}`)
      })

      socket.on('cursor-move', (data) => {
        socket.to(data.roomId).emit('cursor-move', data)
      })

      socket.on('disconnect', () => {
        // console.log('❌ User disconnected:', socket.id)
      })
    })

    global.io = io
  }

  return new Response('Socket.IO server running')
}
