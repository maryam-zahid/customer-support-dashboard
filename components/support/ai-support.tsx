'use client'

import * as React from 'react'
import {
  ArrowUpIcon,
  CopyIcon,
  RefreshCwIcon,
  SparklesIcon,
  SquareIcon,
  TriangleAlertIcon,
  Trash2Icon,
} from 'lucide-react'


import {
  AI_SUGGESTIONS,
  formatTime,
  type ChatMessage,
} from '@/lib/support-data'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Alert,
  AlertAction,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import {
  Bubble,
  BubbleContent,
} from '@/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message'
import {
} from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

let idCounter = 0
const uid = () => `m-${Date.now()}-${idCounter++}`

export function AISupport() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [streaming, setStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
const [provider, setProvider] = React.useState<'auto' | 'gemini' | 'groq'>('auto')
//////////
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const stopStreaming = React.useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setStreaming(false)
  }, [])

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const runAssistant = React.useCallback(async (prompt: string) => {
    setError(null)
    setStreaming(true)

    const assistantId = uid()
    const controller = new AbortController()

    abortControllerRef.current = controller

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      },
    ])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({
        //   message: prompt,
        // }),

        body: JSON.stringify({
  message: prompt,
  provider,
}),
        signal: controller.signal,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)

        throw new Error(
          result?.error ?? `Request failed with status ${response.status}.`,
        )
      }

      if (!response.body) {
        throw new Error('The server did not return a response stream.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, {
          stream: true,
        })

        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          const lines = eventBlock.split(/\r?\n/)
          const eventName =
            lines
              .find((line) => line.startsWith('event:'))
              ?.slice(6)
              .trim() ?? 'message'

          const dataText = lines
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')

          if (!dataText) {
            continue
          }

          const data = JSON.parse(dataText) as {
            content?: string
            message?: string
          }

          if (eventName === 'chunk' && data.content) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: message.content + data.content,
                    }
                  : message,
              ),
            )

            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => resolve())
            })
          }

          if (eventName === 'error') {
            throw new Error(
              data.message ?? 'The assistant could not generate a response.',
            )
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== assistantId ||
              message.content.trim().length > 0,
          ),
        )

        return
      }

      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== assistantId || message.content.trim().length > 0,
        ),
      )

      setError(
        error instanceof Error
          ? error.message
          : 'The assistant could not complete the response.',
      )
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setStreaming(false)
      }
    }
  }, [provider])
  const send = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', content: trimmed, createdAt: Date.now() },
      ])
      setInput('')
      runAssistant(trimmed)
    },
    [runAssistant, streaming],
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      send(input)
    }
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      setError(null)
      runAssistant(lastUser.content)
    }
  }

  function clearChat() {
    stopStreaming()
    setMessages([])
    setError(null)
  }

  const isEmpty = messages.length === 0
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.id

  return (
    <div className="flex h-full flex-col">
     {/* AI assistant header */}
<div className="border-b border-border bg-card/30 px-4 py-4 sm:px-6">
  <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    {/* Assistant details */}
    <div className="flex min-w-0 items-center gap-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
        {provider === "gemini" ? (
  <span className="text-lg">💎</span>
) : provider === "groq" ? (
  <span className="text-lg">⚡</span>
) : (
  <SparklesIcon className="size-6" />
)}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            Helix Assistant
          </h2>

          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 py-1"
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            Online
          </Badge>
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
  <span>GPT-grade answers grounded in your help center</span>

  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
    {provider === "auto"
      ? "Auto"
      : provider === "gemini"
      ? "Gemini"
      : "Groq"}
  </span>
</div>
      </div>
    </div>

    {/* Provider and clear controls */}
    <div className="flex w-full items-stretch gap-2 sm:items-center lg:w-auto">
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-primary/30 bg-background/70 p-3 shadow-sm sm:flex-row sm:items-center lg:min-w-[520px]">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            AI Provider
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose response model
          </p>
        </div>

        <select
          value={provider}
          onChange={(event) =>
            setProvider(
              event.target.value as 'auto' | 'gemini' | 'groq',
            )
          }
          disabled={streaming}
          className="h-11 w-full rounded-lg border border-primary/40 bg-background px-4 text-sm font-semibold text-foreground outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-64"
          aria-label="Select AI provider"
        >
          <option value="auto">✦ Auto fallback</option>
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
        </select>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={clearChat}
              disabled={isEmpty}
              aria-label="Clear conversation"
            />
          }
        >
          <Trash2Icon className="size-4" />
        </TooltipTrigger>

        <TooltipContent>Clear conversation</TooltipContent>
      </Tooltip>
    </div>
  </div>
</div>
         
    {/* Transcript */}
      <div className="relative min-h-0 flex-1">
        {isEmpty ? (
          <AIEmptyState onPick={send} />
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="h-full">
              <MessageScrollerViewport className="px-4 py-6 sm:px-6">
                {/* <MessageScrollerContent className="mx-auto flex max-w-3xl flex-col gap-6"> */}
                <MessageScrollerContent className="mx-auto flex max-w-6xl flex-col gap-10">
                  {messages.map((m) => (
                    <MessageScrollerItem
                      key={m.id}
                      messageId={m.id}
                      scrollAnchor={m.role === 'user'}
                    >
                      <Message align={m.role === 'user' ? 'end' : 'start'}>
                        <MessageAvatar>
                          {m.role === 'assistant' ? (
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <SparklesIcon className="size-4" />
                            </span>
                          ) : (
                            <Avatar className="size-8">
                              <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                          )}
                        </MessageAvatar>
                        <MessageContent>
                          <MessageHeader>
                            {m.role === 'assistant' ? 'Helix Assistant' : 'You'}
                          </MessageHeader>
                          <Bubble
  variant={m.role === 'user' ? 'default' : 'muted'}
  align={m.role === 'user' ? 'end' : 'start'}
  className={cn(
    'max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[70%]',
    m.role === 'user'
      ? 'border-primary/30 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
      : 'border-border bg-muted/70 text-foreground',
  )}
>
                            <BubbleContent>
                              {m.content ? (
<p className="whitespace-pre-wrap text-sm leading-6 sm:text-base">
                                    {m.content}
                                </p>
                              ) : (
                                <TypingDots />
                              )}
                            </BubbleContent>
                          </Bubble>
                          <MessageFooter className="gap-2">
                            <span>{formatTime(m.createdAt)}</span>
                            {m.role === 'assistant' &&
                              m.content &&
                              m.id === lastAssistantId &&
                              !streaming && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(m.content)
                                    toast.success('Copied to clipboard')
                                  }}
                                >
                                  <CopyIcon className="size-3" />
                                  Copy
                                </button>
                              )}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}

                  {error && (
                    <MessageScrollerItem messageId="error">
                      <div className="mx-auto w-full max-w-3xl">
                        <Alert variant="destructive">
                          <TriangleAlertIcon />
                          <AlertTitle>Something went wrong</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                          <AlertAction>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={retryLast}
                            >
                              <RefreshCwIcon data-icon="inline-start" />
                              Retry
                            </Button>
                          </AlertAction>
                        </Alert>
                      </div>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card/40 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <InputGroup>
            <InputGroupTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask the assistant anything..."
              rows={1}
              aria-label="Message the assistant"
            />
            <InputGroupAddon align="block-end">
              <InputGroupText className="text-xs">
                <Kbd>Enter</Kbd> to send <Kbd>Shift</Kbd>
                <Kbd>Enter</Kbd> for newline
              </InputGroupText>
              {streaming ? (
                <InputGroupButton
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={stopStreaming}
                >
                  <SquareIcon
                    data-icon="inline-start"
                    className="fill-current"
                  />
                  Stop
                </InputGroupButton>
              ) : (
                <InputGroupButton
                  size="icon-sm"
                  variant="default"
                  className="ml-auto"
                  disabled={!input.trim()}
                  onClick={() => send(input)}
                  aria-label="Send message"
                >
                  <ArrowUpIcon />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
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

function AIEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <Empty className="max-w-lg">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 text-primary"
          >
            <SparklesIcon />
          </EmptyMedia>
          <EmptyTitle>How can I help today?</EmptyTitle>
          <EmptyDescription>
            Ask the Helix Assistant to draft replies, look up policies, or
            summarize conversations. Responses stream in real time.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPick(s)}
                className={cn(
                  'rounded-lg border border-border bg-card px-3.5 py-3 text-left text-sm text-card-foreground transition-colors',
                  'hover:border-primary/40 hover:bg-accent',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}






