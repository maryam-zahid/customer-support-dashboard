// Shared types and mock data for the support workspace.

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
}

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface Person {
  id: string
  name: string
  avatar: string
  status: PresenceStatus
  role?: string
}

export interface ConversationMessage {
  id: string
  authorId: string
  content: string
  createdAt: number
}

export interface Conversation {
  id: string
  customer: Person
  subject: string
  channel: 'Chat' | 'Email' | 'Voice'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  unread: number
  lastActivity: number
  status: 'open' | 'pending' | 'resolved'
  messages: ConversationMessage[]
}

// ---- AI Support ----------------------------------------------------------

export const AI_SUGGESTIONS: string[] = [
  'How do I reset a customer password?',
  'Draft a refund apology email',
  'Summarize this week\u2019s support trends',
  'What is our SLA for enterprise plans?',
]

// A canned, deterministic assistant reply used to simulate streaming.
export function generateAssistantReply(prompt: string): string {
  const normalized = prompt.toLowerCase()

  if (normalized.includes('refund')) {
    return "Here's a warm, on-brand refund email you can send:\n\nHi there,\n\nThank you for reaching out, and I'm sorry for the frustration this caused. I've gone ahead and issued a full refund to your original payment method \u2014 it should appear within 5\u20137 business days.\n\nIf there's anything else I can do to make this right, just reply here and I'll jump on it.\n\nWarm regards,\nThe Support Team"
  }

  if (normalized.includes('password') || normalized.includes('reset')) {
    return "To reset a customer's password:\n\n1. Open the customer's profile in the Admin panel.\n2. Select \u201cSecurity\u201d, then \u201cSend reset link\u201d.\n3. The customer receives a secure, single-use link valid for 30 minutes.\n\nIf they don't see the email, ask them to check spam and confirm the address on file is correct. You can also generate a temporary passcode from the same screen."
  }

  if (normalized.includes('sla') || normalized.includes('enterprise')) {
    return 'Our enterprise SLA guarantees a first response within 1 hour, 24/7, with a 99.9% uptime commitment. Priority incidents (P1) are acknowledged within 15 minutes and staffed continuously until resolution. Customers can track live status on the dedicated status page linked in their workspace.'
  }

  if (normalized.includes('trend') || normalized.includes('summar')) {
    return "This week's snapshot:\n\n\u2022 Ticket volume is down 12% week-over-week.\n\u2022 Median first-response time improved to 3m 41s.\n\u2022 Top themes: billing questions (34%), onboarding (21%), integrations (18%).\n\u2022 CSAT held steady at 4.7/5 across 812 rated conversations.\n\nWould you like me to break any of these down by channel or plan tier?"
  }

  return `Great question! Here's how I'd approach "${prompt.trim()}":\n\nI'd start by confirming the customer's context, then walk through the most likely cause and a concrete next step. I can draft a reply, pull up relevant docs, or hand this off to a human agent whenever you'd like. Just let me know how you'd like to proceed.`
}

// ---- Human Support -------------------------------------------------------

const now = Date.now()
const min = 60_000

export const CURRENT_AGENT: Person = {
  id: 'agent-you',
  name: 'You',
  avatar: '/support-agent-avatar.png',
  status: 'online',
  role: 'Support Agent',
}

export const TEAM: Person[] = [
  {
    id: 'a1',
    name: 'Maya Chen',
    avatar: '/agent-maya.png',
    status: 'online',
    role: 'Team Lead',
  },
  {
    id: 'a2',
    name: 'Devon Park',
    avatar: '/agent-devon.png',
    status: 'online',
    role: 'Billing',
  },
  {
    id: 'a3',
    name: 'Priya Nair',
    avatar: '/agent-priya.png',
    status: 'away',
    role: 'Tier 2',
  },
  {
    id: 'a4',
    name: 'Sam Rivera',
    avatar: '/agent-sam.jpg',
    status: 'offline',
    role: 'Onboarding',
  },
]

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    subject: 'Charged twice this month',
    channel: 'Chat',
    priority: 'high',
    unread: 2,
    lastActivity: now - 2 * min,
    status: 'open',
    customer: {
      id: 'cust-1',
      name: 'Jordan Blake',
      avatar: '/customer-jordan.png',
      status: 'online',
    },
    messages: [
      {
        id: 'm1',
        authorId: 'cust-1',
        content:
          'Hi! I just noticed my card was charged twice for the Pro plan this month. Can you help?',
        createdAt: now - 9 * min,
      },
      {
        id: 'm2',
        authorId: 'agent-you',
        content:
          "Hi Jordan, so sorry about that \u2014 I can definitely help. Let me pull up your billing history real quick.",
        createdAt: now - 7 * min,
      },
      {
        id: 'm3',
        authorId: 'cust-1',
        content: 'Thank you! The second charge was on the 14th.',
        createdAt: now - 6 * min,
      },
      {
        id: 'm4',
        authorId: 'agent-you',
        content:
          'Found it. That was a failed retry that got captured twice. I\u2019m refunding the duplicate now \u2014 you\u2019ll see it in 5\u20137 days.',
        createdAt: now - 4 * min,
      },
      {
        id: 'm5',
        authorId: 'cust-1',
        content: 'Amazing, that was fast. Really appreciate it!',
        createdAt: now - 2 * min,
      },
    ],
  },
  {
    id: 'c2',
    subject: 'Can\u2019t connect Slack integration',
    channel: 'Email',
    priority: 'normal',
    unread: 0,
    lastActivity: now - 26 * min,
    status: 'pending',
    customer: {
      id: 'cust-2',
      name: 'Amara Osei',
      avatar: '/customer-amara.png',
      status: 'away',
    },
    messages: [
      {
        id: 'm1',
        authorId: 'cust-2',
        content:
          'The Slack integration keeps saying "authorization failed" when I try to connect our workspace.',
        createdAt: now - 40 * min,
      },
      {
        id: 'm2',
        authorId: 'agent-you',
        content:
          'Thanks for flagging! That usually means the workspace admin needs to approve the app. Are you an admin on that Slack workspace?',
        createdAt: now - 26 * min,
      },
    ],
  },
  {
    id: 'c3',
    subject: 'Feature request: bulk export',
    channel: 'Chat',
    priority: 'low',
    unread: 0,
    lastActivity: now - 3 * 60 * min,
    status: 'open',
    customer: {
      id: 'cust-3',
      name: 'Leo Martins',
      avatar: '/customer-leo.png',
      status: 'offline',
    },
    messages: [
      {
        id: 'm1',
        authorId: 'cust-3',
        content:
          'Would love a way to export all my reports at once instead of one by one. Is that on the roadmap?',
        createdAt: now - 3 * 60 * min,
      },
    ],
  },
  {
    id: 'c4',
    subject: 'Upgrade to Enterprise',
    channel: 'Voice',
    priority: 'urgent',
    unread: 1,
    lastActivity: now - 55 * min,
    status: 'open',
    customer: {
      id: 'cust-4',
      name: 'Nadia Volkov',
      avatar: '/customer-nadia.png',
      status: 'online',
    },
    messages: [
      {
        id: 'm1',
        authorId: 'cust-4',
        content:
          'Our team is growing fast and we need SSO plus a higher seat count. What does Enterprise look like?',
        createdAt: now - 55 * min,
      },
    ],
  },
]

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
