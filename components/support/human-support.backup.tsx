'use client'

import * as React from 'react'
import {
  ArrowLeftIcon,
  CheckCheckIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react'

import {
  CONVERSATIONS,
  CURRENT_AGENT,
  TEAM,
  formatRelative,
  formatTime,
  type Conversation,
  type ConversationMessage,
  type Person,
  type PresenceStatus,
} from '@/lib/support-data'
import { cn } from '@/lib/utils'
import { getSocket } from '@/lib/socket/client'
import type {
  ChatMessagePayload,
  TypingPayload,
} from '@/lib/socket/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bubble,
  BubbleContent,
} from '@/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from '@/components/ui/message'
import { Marker, MarkerContent } from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const statusColor: Record<PresenceStatus, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground/40',
}

const channelIcon = {
  Chat: MessageSquareIcon,
  Email: MailIcon,
  Voice: PhoneIcon,
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

let mid = 0
const nextId = () => `hm-${Date.now()}-${mid++}`

export function HumanSupport() {
  const [conversations, setConversations] = React.useState<Conversation[]>(
    () => CONVERSATIONS.map((c) => ({ ...c, messages: [...c.messages] })),
  )
  const [activeId, setActiveId] = React.useState<string>(CONVERSATIONS[0].id)
  const [query, setQuery] = React.useState('')
  const [draft, setDraft] = React.useState('')
  const [typing, setTyping] = React.useState(false)

  const socket = React.useMemo(() => getSocket(), [])
  const [connected, setConnected] = React.useState(
    () => socket.connected,
  )

  // controls the mobile master/detail view
  const [showThread, setShowThread] = React.useState(false)

  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    function handleConnect() {
      setConnected(true)
    }

    function handleDisconnect() {
      setConnected(false)
    }

    function handleConnectError() {
      setConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    if (!socket.connected) {
      socket.connect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [socket])

  const active = conversations.find((c) => c.id === activeId)!

  React.useEffect(() => {
    const payload = {
      conversationId: activeId,
      userId: CURRENT_AGENT.id,
      userName: CURRENT_AGENT.name,
      role: 'agent' as const,
    }

    socket.emit('chat:join', payload)

    return () => {
      socket.emit('chat:leave', payload)
    }
  }, [activeId, socket])

  React.useEffect(() => {
    function handleMessage(message: ChatMessagePayload) {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== message.conversationId) {
            return conversation
          }

          const alreadyExists = conversation.messages.some(
            (existingMessage) => existingMessage.id === message.id,
          )

          if (alreadyExists) {
            return conversation
          }

          const incomingMessage: ConversationMessage = {
            id: message.id,
            authorId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
          }

          return {
            ...conversation,
            messages: [...conversation.messages, incomingMessage],
            lastActivity: message.createdAt,
            unread:
              message.conversationId === activeId ||
              message.senderRole === 'agent'
                ? 0
                : conversation.unread + 1,
          }
        }),
      )
    }

    socket.on('chat:message', handleMessage)

    return () => {
      socket.off('chat:message', handleMessage)
    }
  }, [activeId, socket])
  React.useEffect(() => {
    function handleTyping(payload: TypingPayload) {
      if (
        payload.conversationId !== activeId ||
        payload.role !== 'customer'
      ) {
        return
      }

      setTyping(payload.isTyping)

      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }

      if (payload.isTyping) {
        typingTimer.current = setTimeout(() => {
          setTyping(false)
        }, 3000)
      }
    }

    socket.on('chat:typing', handleTyping)

    return () => {
      socket.off('chat:typing', handleTyping)

      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
    }
  }, [activeId, socket])
  const filtered = conversations.filter(
    (c) =>
      c.customer.name.toLowerCase().includes(query.toLowerCase()) ||
      c.subject.toLowerCase().includes(query.toLowerCase()),
  )

  const openCount = conversations.filter((c) => c.status === 'open').length
  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0)
  const onlineTeam = TEAM.filter((t) => t.status === 'online').length + 1

  function selectConversation(id: string) {
    setActiveId(id)
    setShowThread(true)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    )
  }

  function emitAgentTyping(isTyping: boolean) {
    const payload: TypingPayload = {
      conversationId: activeId,
      userId: CURRENT_AGENT.id,
      userName: CURRENT_AGENT.name,
      role: 'agent',
      isTyping,
    }

    socket.emit('chat:typing', payload)
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    emitAgentTyping(value.trim().length > 0)

    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }

    typingTimer.current = setTimeout(() => {
      emitAgentTyping(false)
    }, 1200)
  }
  function sendReply() {
    const text = draft.trim()

    if (!text || !connected) {
      return
    }

    const message: ChatMessagePayload = {
      id: nextId(),
      conversationId: activeId,
      senderId: CURRENT_AGENT.id,
      senderName: CURRENT_AGENT.name,
      senderRole: 'agent',
      content: text,
      createdAt: Date.now(),
    }

    socket.emit('chat:message', message)
    emitAgentTyping(false)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatsBar
        openCount={openCount}
        totalUnread={totalUnread}
        onlineTeam={onlineTeam}
        connected={connected}
      />
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_280px]">
        {/* Conversation list */}
        <aside
         className={cn(
  'min-h-0 min-w-0 flex-col border-r border-border',
  showThread ? 'hidden lg:flex' : 'flex',
)}
        >
          <div className="border-b border-border p-3">
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
              />
            </InputGroup>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => selectConversation(c.id)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No conversations match “{query}”.
              </p>
            )}
          </div>
        </aside>

        {/* Active thread */}
        <section
         className={cn(
  'min-h-0 min-w-0 flex-col bg-background',
  showThread ? 'flex' : 'hidden lg:flex',
)}
        >
          <ThreadHeader
            conversation={active}
            connected={connected}
            onBack={() => setShowThread(false)}
          />
          <div className="relative min-h-0 flex-1">
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="h-full">
                {/* <MessageScrollerViewport className="px-4 py-5 sm:px-6"> */}
                  <MessageScrollerViewport className="bg-gradient-to-b from-background via-background to-primary/[0.02] px-4 py-8 sm:px-8">
                  <MessageScrollerContent className="mx-auto flex max-w-2xl flex-col gap-4">
                    <MessageScrollerItem messageId="day">
                      <Marker variant="separator">
                        <MarkerContent>Today</MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                    {active.messages.map((m) => {
                      const mine = m.authorId === CURRENT_AGENT.id
                      const sender = mine ? CURRENT_AGENT : active.customer
                      return (
                        <MessageScrollerItem
                          key={m.id}
                          messageId={m.id}
                          scrollAnchor={mine}
                        >
                          <Message align={mine ? 'end' : 'start'}>
                            <MessageAvatar>
                              <Avatar className="size-8">
                                <AvatarImage
                                  src={sender.avatar || '/placeholder.svg'}
                                  alt={sender.name}
                                />
                                <AvatarFallback>
                                  {initials(sender.name)}
                                </AvatarFallback>
                              </Avatar>
                            </MessageAvatar>
                            <MessageContent>
                              <Bubble
                                variant={mine ? 'default' : 'secondary'}
                                align={mine ? 'end' : 'start'}
                              >
                                <BubbleContent>{m.content}</BubbleContent>
                              </Bubble>
                              <MessageFooter className="gap-1.5">
                                <span>{formatTime(m.createdAt)}</span>
                                {mine && (
                                  <CheckCheckIcon className="size-3.5 text-primary" />
                                )}
                              </MessageFooter>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      )
                    })}
                    {typing && (
                      <MessageScrollerItem messageId="typing">
                        <Message align="start">
                          <MessageAvatar>
                            <Avatar className="size-8">
                              <AvatarImage
                                src={active.customer.avatar || '/placeholder.svg'}
                                alt={active.customer.name}
                              />
                              <AvatarFallback>
                                {initials(active.customer.name)}
                              </AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <Bubble variant="secondary" align="start">
                              <BubbleContent>
                                <TypingDots />
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card/40 p-3 sm:px-6 sm:py-4">
            <InputGroup className="h-10">
              <InputGroupInput
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  ) {
                    e.preventDefault()
                    sendReply()
                  }
                }}
                placeholder={
                  connected
                    ? `Reply to ${active.customer.name.split(' ')[0]}...`
                    : 'Reconnecting — messages will send once online'
                }
                disabled={!connected}
                aria-label="Reply to customer"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  variant="default"
                  disabled={!draft.trim() || !connected}
                  onClick={sendReply}
                  aria-label="Send reply"
                >
<SendIcon className="size-4 rotate-[-20deg]" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </section>

      
      </div>
    </div>
  )
}

function StatsBar({
  openCount,
  totalUnread,
  onlineTeam,
  connected,
}: {
  openCount: number
  totalUnread: number
  onlineTeam: number
  connected: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:gap-3 sm:px-6">
      <Stat label="Open" value={openCount} />
      <Separator orientation="vertical" className="hidden h-8 sm:block" />
      <Stat label="Unread" value={totalUnread} accent="primary" />
      <Separator orientation="vertical" className="hidden h-8 sm:block" />
      <Stat label="Agents online" value={onlineTeam} accent="success" />
      <div className="ml-auto">
        <ConnectionBadge connected={connected} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'primary' | 'success'
}) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          'text-lg font-semibold tabular-nums leading-none',
          accent === 'primary' && 'text-primary',
          accent === 'success' && 'text-success',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant={connected ? 'secondary' : 'outline'}
      className={cn(
        'gap-1.5',
        !connected && 'border-warning/50 text-warning',
      )}
    >
      {connected ? (
        <>
          <WifiIcon className="size-3.5 text-success" />
          Connected
        </>
      ) : (
        <>
          <WifiOffIcon className="size-3.5 animate-pulse" />
          Reconnecting
        </>
      )}
    </Badge>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation
  active: boolean
  onSelect: () => void
}) {
  const Icon = channelIcon[conversation.channel]
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-muted/60',
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          <AvatarImage
            src={conversation.customer.avatar || '/placeholder.svg'}
            alt={conversation.customer.name}
          />
          <AvatarFallback>{initials(conversation.customer.name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-background',
            statusColor[conversation.customer.status],
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {conversation.customer.name}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatRelative(conversation.lastActivity)}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{conversation.subject}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {conversation.priority === 'urgent' && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              Urgent
            </Badge>
          )}
          {conversation.priority === 'high' && (
            <Badge
              variant="outline"
              className="h-5 border-warning/50 px-1.5 text-[10px] text-warning"
            >
              High
            </Badge>
          )}
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
            {conversation.status}
          </Badge>
          {conversation.unread > 0 && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function ThreadHeader({
  conversation,
  connected,
  onBack,
}: {
  conversation: Conversation
  connected: boolean
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        // className="md:hidden"
        className="lg:hidden"
        onClick={onBack}
        aria-label="Back to conversations"
      >
        <ArrowLeftIcon />
      </Button>
      <div className="relative shrink-0">
        <Avatar className="size-9">
          <AvatarImage
            src={conversation.customer.avatar || '/placeholder.svg'}
            alt={conversation.customer.name}
          />
          <AvatarFallback>{initials(conversation.customer.name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background',
            statusColor[conversation.customer.status],
          )}
        />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold">
          {conversation.customer.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {conversation.customer.status === 'online'
            ? 'Active now'
            : `Last seen ${formatRelative(conversation.lastActivity)}`}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Call customer" />
            }
          >
            <PhoneIcon />
          </TooltipTrigger>
          <TooltipContent>Start call</TooltipContent>
        </Tooltip>
        {!connected && (
          <Badge
            variant="outline"
            className="gap-1.5 border-warning/50 text-warning"
          >
            <WifiOffIcon className="size-3.5 animate-pulse" />
            Offline
          </Badge>
        )}
      </div>
    </div>
  )
}

function PresencePanel({ customer }: { customer: Person }) {
  return (
    <div className="flex min-h-0 flex-col">
      {/* Customer card */}
      <div className="flex flex-col items-center gap-2 border-b border-border p-6 text-center">
        <div className="relative">
          <Avatar className="size-16">
            <AvatarImage src={customer.avatar || '/placeholder.svg'} alt={customer.name} />
            <AvatarFallback className="text-lg">
              {initials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute right-0.5 bottom-0.5 size-3.5 rounded-full ring-2 ring-background',
              statusColor[customer.status],
            )}
          />
        </div>
        <div>
          <p className="text-sm font-semibold">{customer.name}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {customer.status}
          </p>
        </div>
        <div className="mt-1 flex gap-2">
          <Badge variant="secondary">Pro plan</Badge>
          <Badge variant="outline">3 tickets</Badge>
        </div>
      </div>

      {/* Team presence */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Team
          <span className="flex items-center gap-1 text-success">
            <span className="size-1.5 rounded-full bg-success" />
            {TEAM.filter((t) => t.status === 'online').length + 1} online
          </span>
        </h4>
        <ul className="flex flex-col gap-1">
          <PresenceRow person={CURRENT_AGENT} you />
          {TEAM.map((t) => (
            <PresenceRow key={t.id} person={t} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function PresenceRow({ person, you }: { person: Person; you?: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={person.avatar || '/placeholder.svg'} alt={person.name} />
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background',
            statusColor[person.status],
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {person.name}
          {you && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (you)
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{person.role}</p>
      </div>
    </li>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}















