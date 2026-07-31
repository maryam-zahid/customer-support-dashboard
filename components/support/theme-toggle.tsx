'use client'

import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')

    root.classList.toggle('dark', next)
    root.classList.toggle('light', !next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle color theme"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
