
import { createServer } from 'node:http'

import next from 'next'
import { Server } from 'socket.io'

import type {
  ActiveConversation,
  ChatMessagePayload,
  ClientToServerEvents,
  JoinConversationPayload,
  ServerToClientEvents,
  TypingPayload,
} from './lib/socket/types'

type ConnectedUser = {
  socketId: string
  userId: string
  userName: string
  role: 'agent' | 'customer'
  conversationId: string
}

const connectedUsers = new Map<string, ConnectedUser>()

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidJoinPayload(
  payload: JoinConversationPayload,
): payload is JoinConversationPayload {
  return (
    isNonEmptyString(payload.conversationId) &&
    isNonEmptyString(payload.userId) &&
    isNonEmptyString(payload.userName) &&
    (payload.role === 'agent' ||
      payload.role === 'customer')
  )
}

function isValidMessage(
  message: ChatMessagePayload,
): message is ChatMessagePayload {
  return (
    isNonEmptyString(message.id) &&
    isNonEmptyString(message.conversationId) &&
    isNonEmptyString(message.senderId) &&
    isNonEmptyString(message.senderName) &&
    (message.senderRole === 'agent' ||
      message.senderRole === 'customer') &&
    isNonEmptyString(message.content) &&
    Number.isFinite(message.createdAt)
  )
}

function isValidTypingPayload(
  payload: TypingPayload,
): payload is TypingPayload {
  return (
    isNonEmptyString(payload.conversationId) &&
    isNonEmptyString(payload.userId) &&
    isNonEmptyString(payload.userName) &&
    (payload.role === 'agent' ||
      payload.role === 'customer') &&
    typeof payload.isTyping === 'boolean'
  )
}

function getActiveConversations(): ActiveConversation[] {
  const conversations = new Map<
    string,
    ActiveConversation
  >()

  for (const user of connectedUsers.values()) {
    if (user.role !== 'customer') {
      continue
    }

    conversations.set(user.conversationId, {
      conversationId: user.conversationId,
      userId: user.userId,
      userName: user.userName,
    })
  }

  return Array.from(conversations.values())
}

async function startServer() {
  const dev = process.env.NODE_ENV !== 'production'
  const hostname = process.env.HOSTNAME ?? 'localhost'
  const port = Number(process.env.PORT ?? 3000)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      'PORT must be a valid positive integer.',
    )
  }

  const app = next({
    dev,
    hostname,
    port,
  })

  const handle = app.getRequestHandler()

  await app.prepare()

  const httpServer = createServer(
    (request, response) => {
      handle(request, response)
    },
  )

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >(httpServer, {
    path: '/api/socket',
    cors: {
      origin: dev
        ? `http://${hostname}:${port}`
        : false,
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('chat:join', (payload) => {
      if (!isValidJoinPayload(payload)) {
        console.warn(
          `Invalid chat:join payload from ${socket.id}`,
        )
        return
      }

      connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId: payload.userId,
        userName: payload.userName,
        role: payload.role,
        conversationId: payload.conversationId,
      })

      if (payload.role === 'agent') {
        /*
         * Every agent joins this shared room.
         * Customer messages will also be sent to this room.
         */
        socket.join('support-agents')

        /*
         * Join the agent to all currently active
         * customer conversation rooms.
         */
        const activeConversations =
          getActiveConversations()

        for (const conversation of activeConversations) {
          socket.join(conversation.conversationId)
        }

        socket.emit(
          'chat:conversations',
          activeConversations,
        )
      }

      if (payload.role === 'customer') {
        socket.join(payload.conversationId)

        /*
         * Join every connected agent to this
         * newly-created customer conversation.
         */
        const agentSockets =
          io.sockets.adapter.rooms.get(
            'support-agents',
          )

        if (agentSockets) {
          for (const agentSocketId of agentSockets) {
            const agentSocket =
              io.sockets.sockets.get(agentSocketId)

            agentSocket?.join(payload.conversationId)
          }
        }

        io.to('support-agents').emit(
          'chat:conversation-added',
          {
            conversationId:
              payload.conversationId,
            userId: payload.userId,
            userName: payload.userName,
          },
        )
      }

      socket
        .to(payload.conversationId)
        .emit('chat:user-joined', payload)
    })

    socket.on('chat:leave', (payload) => {
      if (!isValidJoinPayload(payload)) {
        console.warn(
          `Invalid chat:leave payload from ${socket.id}`,
        )
        return
      }

      if (payload.role === 'customer') {
        socket.leave(payload.conversationId)
      }

      socket
        .to(payload.conversationId)
        .emit('chat:user-left', payload)

      connectedUsers.delete(socket.id)
    })

    socket.on('chat:message', (message) => {
      if (!isValidMessage(message)) {
        console.warn(
          `Invalid chat:message payload from ${socket.id}`,
        )
        return
      }

      const sanitizedMessage: ChatMessagePayload = {
        ...message,
        content: message.content.trim(),
      }

      /*
       * Send the message to:
       *
       * 1. The customer conversation room.
       * 2. Every connected support agent.
       *
       * Socket.IO automatically prevents duplicates
       * when one socket exists in both rooms.
       */
      io.to(sanitizedMessage.conversationId)
        .to('support-agents')
        .emit('chat:message', sanitizedMessage)
    })

    socket.on('chat:typing', (payload) => {
      if (!isValidTypingPayload(payload)) {
        console.warn(
          `Invalid chat:typing payload from ${socket.id}`,
        )
        return
      }

      if (payload.role === 'customer') {
        socket
          .to('support-agents')
          .emit('chat:typing', payload)

        return
      }

      socket
        .to(payload.conversationId)
        .emit('chat:typing', payload)
    })

    socket.on('chat:get-conversations', () => {
      socket.emit(
        'chat:conversations',
        getActiveConversations(),
      )
    })

    socket.on('disconnect', (reason) => {
      const disconnectedUser =
        connectedUsers.get(socket.id)

      connectedUsers.delete(socket.id)

      if (
        disconnectedUser &&
        disconnectedUser.role === 'customer'
      ) {
        io.to('support-agents').emit(
          'chat:user-left',
          {
            conversationId:
              disconnectedUser.conversationId,
            userId: disconnectedUser.userId,
            userName: disconnectedUser.userName,
            role: 'customer',
          },
        )
      }

      console.log(
        `Socket disconnected: ${socket.id} (${reason})`,
      )
    })
  })

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error)
  })

  httpServer.listen(port, hostname, () => {
    console.log(
      `> Ready on http://${hostname}:${port}`,
    )
    console.log(
      '> Socket.IO path: /api/socket',
    )
  })
}

startServer().catch((error) => {
  console.error(
    'Failed to start server:',
    error,
  )

  process.exit(1)
})