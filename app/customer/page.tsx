

'use client'

import * as React from 'react'
import {
  ArrowLeftIcon,
  CheckCheckIcon,
  CircleIcon,
  HeadphonesIcon,
  LogInIcon,
  SendIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSocket } from '@/lib/socket/client'
import type {
  ChatMessagePayload,
  JoinConversationPayload,
  TypingPayload,
} from '@/lib/socket/types'

type CustomerSession = {
  conversationId: string
  customerId: string
  customerName: string
}

function createSafeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createCustomerSession(
  customerName: string,
): CustomerSession {
  const safeName =
    createSafeId(customerName) || 'customer'

  const uniquePart =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`

  return {
    customerId: `customer-${safeName}-${uniquePart}`,
    conversationId: `conversation-${uniquePart}`,
    customerName: customerName.trim(),
  }
}

export default function CustomerPage() {
  const socket = React.useMemo(() => getSocket(), [])

  const [nameInput, setNameInput] =
    React.useState('')

  const [session, setSession] =
    React.useState<CustomerSession | null>(null)

  const [connected, setConnected] =
    React.useState(() => socket.connected)

  const [draft, setDraft] =
    React.useState('')

  const [messages, setMessages] =
    React.useState<ChatMessagePayload[]>([])

  const [agentTyping, setAgentTyping] =
    React.useState(false)

  const typingTimer =
    React.useRef<ReturnType<typeof setTimeout> | null>(
      null,
    )

  const messagesEndRef =
    React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function handleConnect() {
      setConnected(true)
    }

    function handleDisconnect() {
      setConnected(false)
      setAgentTyping(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    // if (!socket.connected) {
    //   socket.connect()
    // } else {
    //   setConnected(true)
    // }
if (!socket.connected) {
  socket.connect()
}
    return () => {
      socket.off('connect', handleConnect)
      socket.off(
        'disconnect',
        handleDisconnect,
      )
    }
  }, [socket])

  React.useEffect(() => {
    if (!session) {
      return
    }

    const joinPayload: JoinConversationPayload = {
      conversationId:
        session.conversationId,
      userId: session.customerId,
      userName: session.customerName,
      role: 'customer',
    }

    function joinConversation() {
      socket.emit('chat:join', joinPayload)
    }

    function handleMessage(
      message: ChatMessagePayload,
    ) {
      if (
        message.conversationId !==
        session?.conversationId
      ) {
        return
      }

      setMessages((currentMessages) => {
        const alreadyExists =
          currentMessages.some(
            (currentMessage) =>
              currentMessage.id === message.id,
          )

        if (alreadyExists) {
          return currentMessages
        }

        return [
          ...currentMessages,
          message,
        ]
      })
    }

    function handleTyping(
      payload: TypingPayload,
    ) {
      if (
        payload.conversationId !==
          session?.conversationId ||
        payload.role !== 'agent'
      ) {
        return
      }

      setAgentTyping(payload.isTyping)
    }

    socket.on('chat:message', handleMessage)
    socket.on('chat:typing', handleTyping)
    socket.on('connect', joinConversation)

    if (socket.connected) {
      joinConversation()
    } else {
      socket.connect()
    }

    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }

      socket.emit('chat:leave', joinPayload)

      socket.off(
        'chat:message',
        handleMessage,
      )

      socket.off(
        'chat:typing',
        handleTyping,
      )

      socket.off(
        'connect',
        joinConversation,
      )
    }
  }, [session, socket])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, agentTyping])

  function enterSupport() {
    const customerName = nameInput.trim()

    if (!customerName) {
      return
    }

    const newSession =
      createCustomerSession(customerName)

    setMessages([])
    setDraft('')
    setAgentTyping(false)
    setSession(newSession)
  }

  function leaveSupport() {
    if (session) {
      const leavePayload:
        JoinConversationPayload = {
        conversationId:
          session.conversationId,
        userId: session.customerId,
        userName: session.customerName,
        role: 'customer',
      }

      socket.emit('chat:leave', leavePayload)
    }

    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }

    setSession(null)
    setMessages([])
    setDraft('')
    setAgentTyping(false)
  }

  function emitTyping(isTyping: boolean) {
    if (!session) {
      return
    }

    const payload: TypingPayload = {
      conversationId:
        session.conversationId,
      userId: session.customerId,
      userName: session.customerName,
      role: 'customer',
      isTyping,
    }

    socket.emit('chat:typing', payload)
  }

  function handleDraftChange(value: string) {
    setDraft(value)

    emitTyping(value.trim().length > 0)

    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }

    typingTimer.current = setTimeout(() => {
      emitTyping(false)
    }, 1200)
  }

  function sendMessage() {
    const text = draft.trim()

    if (!text || !connected || !session) {
      return
    }

    const message: ChatMessagePayload = {
      id:
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID ===
          'function'
          ? crypto.randomUUID()
          : `customer-message-${Date.now()}`,
      conversationId:
        session.conversationId,
      senderId: session.customerId,
      senderName: session.customerName,
      senderRole: 'customer',
      content: text,
      createdAt: Date.now(),
    }

    socket.emit('chat:message', message)

    emitTyping(false)
    setDraft('')
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 lg:py-12">
        <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-background shadow-lg">
          <header className="border-b bg-card px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <HeadphonesIcon className="size-6" />
              </div>

              <div>
                <h1 className="text-xl font-semibold">
                  Customer Support
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Start a new live support
                  conversation.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium">
                Welcome to live support
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Enter your name to create a
                private conversation with a
                support agent.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="customer-name"
                className="text-sm font-medium"
              >
                Your full name
              </label>

              <Input
                id="customer-name"
                value={nameInput}
                onChange={(event) =>
                  setNameInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    enterSupport()
                  }
                }}
                placeholder="Enter your name"
                autoComplete="name"
                autoFocus
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              disabled={!nameInput.trim()}
              onClick={enterSupport}
            >
              <LogInIcon className="size-4" />
              Start support chat
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-4" />
              Your conversation is private
              and secure.
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:py-10">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-lg lg:min-h-190">
        <header className="border-b bg-card px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <HeadphonesIcon className="size-6" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold">
                  Customer Support
                </h1>

                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleIcon
                    className={
                      connected
                        ? 'size-2.5 fill-emerald-500 text-emerald-500'
                        : 'size-2.5 fill-amber-500 text-amber-500'
                    }
                  />

                  <span>
                    {connected
                      ? 'Support team is online'
                      : 'Reconnecting to support'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <ShieldCheckIcon className="size-4" />
                Secure conversation
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={leaveSupport}
              >
                <ArrowLeftIcon className="size-4" />
                Leave
              </Button>
            </div>
          </div>
        </header>

        <div className="border-b bg-muted/30 px-5 py-3 text-sm text-muted-foreground sm:px-7">
          You are chatting as{' '}
          <span className="font-medium text-foreground">
            {session.customerName}
          </span>
        </div>

        <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <div className="mx-auto max-w-md rounded-xl border bg-card px-4 py-3 text-center">
              <p className="text-sm font-medium">
                Welcome to live support
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Send us a message and a support
                agent will assist you.
              </p>
            </div>

            {messages.map((message) => {
              const mine =
                message.senderRole ===
                'customer'

              return (
                <div
                  key={message.id}
                  className={
                    mine
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >
                  <div className="max-w-[85%] sm:max-w-[72%]">
                    <div
                      className={
                        mine
                          ? 'rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm'
                          : 'rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-card-foreground shadow-sm'
                      }
                    >
                      {!mine && (
                        <p className="mb-1 text-xs font-semibold text-primary">
                          Support Agent
                        </p>
                      )}

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.content}
                      </p>
                    </div>

                    <div
                      className={
                        mine
                          ? 'mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground'
                          : 'mt-1.5 text-xs text-muted-foreground'
                      }
                    >
                      <span>
                        {new Date(
                          message.createdAt,
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {mine && (
                        <CheckCheckIcon className="size-3.5" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {agentTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
                  <p className="mb-2 text-xs font-semibold text-primary">
                    Support Agent
                  </p>

                  <div className="flex items-center gap-1">
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <footer className="border-t bg-card p-4 sm:p-5">
          {!connected && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Connection lost. Trying to
              reconnect automatically.
            </div>
          )}

          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Input
              value={draft}
              onChange={(event) =>
                handleDraftChange(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={
                connected
                  ? 'Write your message...'
                  : 'Waiting for connection...'
              }
              disabled={!connected}
              className="h-11 rounded-xl"
              aria-label="Customer message"
            />

            <Button
              type="button"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={sendMessage}
              disabled={
                !draft.trim() || !connected
              }
              aria-label="Send message"
            >
              <SendIcon className="size-4" />
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Please do not share passwords or
            sensitive financial information.
          </p>
        </footer>
      </section>
    </main>
  )
}