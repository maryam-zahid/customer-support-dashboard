// export type ChatMessagePayload = {
//   id: string
//   conversationId: string
//   senderId: string
//   senderName: string
//   senderRole: 'customer' | 'agent'
//   content: string
//   createdAt: number
// }

// export type JoinConversationPayload = {
//   conversationId: string
//   userId: string
//   userName: string
//   role: 'customer' | 'agent'
// }
// export type ActiveConversation = {
//   conversationId: string
//   userId: string
//   userName: string
// }
// export type TypingPayload = {
//   conversationId: string
//   userId: string
//   userName: string
//   role: 'customer' | 'agent'
//   isTyping: boolean
// }


// export type ServerToClientEvents = {
//   'chat:message': (message: ChatMessagePayload) => void
//   'chat:typing': (payload: TypingPayload) => void
//   'chat:user-joined': (payload: JoinConversationPayload) => void
//   'chat:user-left': (payload: JoinConversationPayload) => void
//   'chat:conversations': (conversations: ActiveConversation[]) => void
//   'chat:conversation-added': (conversation: ActiveConversation) => void
// }


// export type ClientToServerEvents = {
//   'chat:join': (payload: JoinConversationPayload) => void
//   'chat:leave': (payload: JoinConversationPayload) => void
//   'chat:message': (message: ChatMessagePayload) => void
//   'chat:typing': (payload: TypingPayload) => void
//   'chat:get-conversations': () => void
// }
export type UserRole = 'customer' | 'agent'

export type ChatMessagePayload = {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: UserRole
  content: string
  createdAt: number
}

export type JoinConversationPayload = {
  conversationId: string
  userId: string
  userName: string
  role: UserRole
}

export type ActiveConversation = {
  conversationId: string
  userId: string
  userName: string
}

export type TypingPayload = {
  conversationId: string
  userId: string
  userName: string
  role: UserRole
  isTyping: boolean
}

export type ServerToClientEvents = {
  'chat:message': (message: ChatMessagePayload) => void

  'chat:typing': (payload: TypingPayload) => void

  'chat:user-joined': (
    payload: JoinConversationPayload,
  ) => void

  'chat:user-left': (
    payload: JoinConversationPayload,
  ) => void

  'chat:conversations': (
    conversations: ActiveConversation[],
  ) => void

  'chat:conversation-added': (
    conversation: ActiveConversation,
  ) => void
}

export type ClientToServerEvents = {
  'chat:join': (
    payload: JoinConversationPayload,
  ) => void

  'chat:leave': (
    payload: JoinConversationPayload,
  ) => void

  'chat:message': (
    message: ChatMessagePayload,
  ) => void

  'chat:typing': (
    payload: TypingPayload,
  ) => void

  'chat:get-conversations': () => void
}