"use client"

import { useCallback, useRef, useState } from "react"
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatRole,
} from "@/types/chat"

const FALLBACK_ERROR =
  "Jawaban belum berhasil dimuat. Periksa koneksi lalu coba lagi."

let messageSequence = 0

function createMessageId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  messageSequence += 1
  return `message-${Date.now().toString(36)}-${messageSequence.toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createMessage(
  role: ChatRole,
  content: string,
  extra: Pick<ChatMessage, "status" | "prompt"> = {}
): ChatMessage {
  return {
    id: createMessageId(),
    role,
    content,
    ...extra,
  }
}

function isChatResponse(payload: unknown): payload is ChatResponse {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.answer === "string" &&
    typeof candidate.conversationId === "string"
  )
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [conversationId, setConversationId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isRequestingRef = useRef(false)

  const requestAnswer = useCallback(
    async (prompt: string, appendUserMessage: boolean) => {
      if (isRequestingRef.current) {
        return
      }

      isRequestingRef.current = true

      if (appendUserMessage) {
        setMessages((current) => [...current, createMessage("user", prompt)])
        setInput("")
      }

      setIsLoading(true)

      try {
        const requestBody: ChatRequest = { message: prompt, conversationId }
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
        const payload: unknown = await response.json().catch(() => null)

        if (!response.ok || !isChatResponse(payload)) {
          throw new Error("Invalid chat response")
        }

        setConversationId(payload.conversationId)
        setMessages((current) => [
          ...current,
          createMessage("assistant", payload.answer),
        ])
      } catch {
        setMessages((current) => [
          ...current,
          createMessage("assistant", FALLBACK_ERROR, {
            status: "error",
            prompt,
          }),
        ])
      } finally {
        isRequestingRef.current = false
        setIsLoading(false)
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    },
    [conversationId]
  )

  const sendMessage = useCallback(
    (rawMessage: string) => {
      const prompt = rawMessage.trim()
      if (prompt) {
        requestAnswer(prompt, true)
      }
    },
    [requestAnswer]
  )

  const retryMessage = useCallback(
    (errorId: string, prompt: string) => {
      setMessages((current) =>
        current.filter((message) => message.id !== errorId)
      )
      requestAnswer(prompt, false)
    },
    [requestAnswer]
  )

  const resetConversation = useCallback(() => {
    if (isRequestingRef.current) {
      return
    }

    setMessages([])
    setInput("")
    setConversationId("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    textareaRef,
    sendMessage,
    retryMessage,
    resetConversation,
  }
}
