'use client'

import * as React from 'react'

import { getSocket } from '@/lib/socket/client'

export function SocketConnectionTest() {
  const [status, setStatus] = React.useState('Connecting...')

  React.useEffect(() => {
    const socket = getSocket()

    function handleConnect() {
      setStatus(`Connected: ${socket.id}`)
    }

    function handleDisconnect() {
      setStatus('Disconnected')
    }

    function handleConnectError(error: Error) {
      setStatus(`Connection error: ${error.message}`)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [])

  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-md border bg-background px-3 py-2 text-xs shadow">
      Socket: {status}
    </div>
  )
}
