'use client'

import * as React from 'react'
import {
  BotIcon,
  HeadphonesIcon,
  LifeBuoyIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AISupport } from '@/components/support/ai-support'
import { HumanSupport } from '@/components/support/human-support'
import { ThemeToggle } from '@/components/support/theme-toggle'

export function SupportDashboard() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/30">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LifeBuoyIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">Helix Support</h1>
          <p className="truncate text-xs text-muted-foreground">
            Customer support workspace
          </p>
        </div>
        {/* <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="hidden gap-1.5 sm:flex">
            <span className="size-1.5 rounded-full bg-success" />
            All systems operational
          </Badge>
          <ThemeToggle />
        </div> */}
        <div className="ml-auto flex items-center gap-2">
  <a
    href="/customer"
    target="_blank"
    rel="noreferrer"
    className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent md:flex"
  >
    <HeadphonesIcon className="size-4" />
    Customer Portal
    <ExternalLinkIcon className="size-4 opacity-70" />
  </a>

  <Badge
    variant="secondary"
    className="hidden gap-1.5 lg:flex"
  >
    <span className="size-1.5 rounded-full bg-success" />
    All systems operational
  </Badge>

  <ThemeToggle />
</div>
      </header>

      {/* Tabs */}
      <Tabs
        defaultValue="ai"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b border-border bg-card px-4 sm:px-6">
          <TabsList variant="line" className="h-auto p-0">
            <TabsTrigger
              value="ai"
              className="flex-none gap-2 px-3 py-3 text-foreground/70 data-active:text-primary"
            >
              <BotIcon data-icon="inline-start" />
              AI Support
            </TabsTrigger>
            <TabsTrigger
              value="human"
              className="flex-none gap-2 px-3 py-3 text-foreground/70 data-active:text-primary"
            >
              <HeadphonesIcon data-icon="inline-start" />
              Human Support
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="ai"
          className="min-h-0 flex-1 overflow-hidden bg-card"
        >
          <AISupport />
        </TabsContent>
        <TabsContent
          value="human"
          className="min-h-0 flex-1 overflow-hidden bg-card"
        >
          <HumanSupport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
