# Helix Support Dashboard

A modern customer support dashboard built with **Next.js 16**, **TypeScript**, **Socket.IO**, **Google Gemini**, and **Groq**.

The project provides two support channels:

- **AI Support** using Large Language Models (LLMs)
- **Human Support** using real-time WebSocket communication

Customers can start a live support conversation while support agents manage multiple customer conversations from a centralized dashboard.

---

# Project Overview

The application consists of two major modules.

## 1. AI Support

- AI-powered customer assistance
- Streaming responses using Server-Sent Events (SSE)
- Gemini as the primary LLM
- Groq as the fallback provider
- Automatic retry mechanism
- Automatic provider fallback

---

## 2. Human Support

- Real-time customer support
- Socket.IO communication
- Dynamic customer conversations
- Multiple concurrent customers
- Typing indicators
- Connection status
- Customer Portal
- Agent Dashboard

---

# Local Setup Instructions


```

```bash
cd customer-support-dashboard
```

---

## Install dependencies

```bash
pnpm install
```

---

## Create environment file

Create

```
.env.local
```

---

# Required Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key

GROQ_API_KEY=your_groq_api_key
```

Replace both keys with your own API keys.

---

# LLM Provider Used

## Primary Provider

Google Gemini

Model

```
gemini-3.6-flash
```

Used for

- AI chat
- Streaming responses
- Retry mechanism

---

## Secondary Provider

Groq

Model

```
llama-3.1-8b-instant
```

Used as fallback whenever Gemini is unavailable or rate limited.

---

# SSE Request and Streaming Flow

```
User

↓

AI Support Page

↓

POST /api/ai/chat

↓

Provider Selection

↓

Gemini
    OR
Groq

↓

Generate Streaming Response

↓

Server Sent Events

↓

Browser

↓

Incremental UI Updates
```

The AI endpoint streams tokens continuously instead of waiting for the complete response.

Supported SSE events

```
start

chunk

complete

error
```

---

# WebSocket Architecture

```
                Customer Portal
                        │
                        │
                  Socket.IO Client
                        │
                        │
               Socket.IO Server
                        │
         ┌──────────────┴──────────────┐
         │                             │
         │                             │
 Conversation Rooms              Support Agents
         │                             │
         └──────────────┬──────────────┘
                        │
                Human Support Dashboard
```

Each customer is assigned an independent conversation room.

Support agents automatically join customer rooms and receive live updates.

---

# WebSocket Event List

## Client → Server

```
chat:join

chat:leave

chat:message

chat:typing

chat:get-conversations
```

---

## Server → Client

```
chat:message

chat:typing

chat:user-joined

chat:user-left

chat:conversation-added

chat:conversations
```

---

# How to Run the Next.js App

Run

```bash
pnpm dev
```

Application

```
http://localhost:3000
```

Customer Portal

```
http://localhost:3000/customer
```

---

# How to Run the WebSocket Server

The application uses a custom Socket.IO server.

Run

```bash
pnpm dev
```

The development command starts

- Next.js
- Socket.IO server

using

```
server.ts
```

---

# Testing Instructions

## AI Support

1. Open

```
http://localhost:3000
```

2. Open AI Support tab

3. Send prompts

4. Verify

- Streaming responses
- Provider selection
- Retry mechanism
- Auto fallback

---

## Human Support

Open

```
http://localhost:3000/customer
```

Enter customer name

Start chat

Open another browser tab

Repeat with another customer

Verify

- Separate conversation created
- Live messages
- Typing indicator
- Independent conversation rooms

---

# Known Limitations

- No authentication
- No database persistence
- Conversations reset after server restart
- No file uploads
- No image sharing
- No customer history
- Single support agent simulation
- No production deployment scaling

---

# Problems Faced and How They Were Resolved

## 1. Gemini Rate Limiting

### Problem

Gemini occasionally returned rate limit or temporary service errors.

### Solution

Implemented

- retry mechanism
- exponential backoff
- automatic fallback to Groq

---

## 2. Different Streaming Formats

### Problem

Gemini and Groq return different streaming payload structures.

### Solution

Implemented separate streaming handlers while exposing a common SSE interface.

---

## 3. Dynamic Customer Conversations

### Problem

Initially every customer joined the same chat room.

### Solution

Implemented

- unique conversation IDs
- dynamic Socket.IO rooms
- automatic conversation creation

---

## 4. Duplicate Messages

### Problem

Messages occasionally appeared multiple times.

### Solution

Validated message IDs before rendering and ignored duplicate events.

---

## 5. WebSocket Reconnection

### Problem

Refreshing the browser disconnected active sessions.

### Solution

Added

- automatic reconnection
- connection status indicator
- automatic room rejoin

---

## 6. AI Streaming Experience

### Problem

Users had to wait for complete responses.

### Solution

Implemented Server-Sent Events to stream responses incrementally for a smoother user experience.

---

