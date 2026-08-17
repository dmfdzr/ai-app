import { useEffect, useRef } from "react"

import { ChatMessage } from "@/components/chat/chat-message"
import type { ChatMessage as ChatMessageType } from "@/types/chat"

interface ChatMessageListProps {
  messages: ChatMessageType[]
  isLoading: boolean
  onRetry: (errorId: string, prompt: string) => void
}

export function ChatMessageList({
  messages,
  isLoading,
  onRetry,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    endRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    })
  }, [messages, isLoading])

  return (
    <div className="message-list" aria-live="polite" aria-busy={isLoading}>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onRetry={onRetry} />
      ))}

      {isLoading ? (
        <div className="message-row message-ai thinking-row" role="status">
          <div className="message-identity thinking-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="message-content">
            <p className="message-label">Mini AI</p>
            <p className="thinking-copy">Sedang menyusun jawaban…</p>
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  )
}
