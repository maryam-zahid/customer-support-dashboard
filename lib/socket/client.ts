'use client'

import { io, type Socket } from 'socket.io-client'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from './types'

let socket:
  | Socket<ServerToClientEvents, ClientToServerEvents>
  | null = null

export function getSocket() {
  if (!socket) {
    socket = io({
      path: '/api/socket',
      autoConnect: false,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
  }

  return socket
}