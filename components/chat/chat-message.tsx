"use client"

import { Bot, Check, Copy, CopyX, RefreshCw, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ChatMessage as ChatMessageType } from "@/types/chat"

type CopyStatus = "idle" | "copied" | "error"

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()

  const didCopy = document.execCommand("copy")
  textarea.remove()

  if (!didCopy) {
    throw new Error("Clipboard is unavailable")
  }
}

interface ChatMessageProps {
  message: ChatMessageType
  onRetry: (errorId: string, prompt: string) => void
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUser = message.role === "user"
  const canRetry = message.status === "error" && Boolean(message.prompt)
  const canCopy = !isUser && message.status !== "error"

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  async function handleCopy() {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
    }

    try {
      await copyText(message.content)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("error")
    }

    feedbackTimerRef.current = setTimeout(() => {
      setCopyStatus("idle")
      feedbackTimerRef.current = null
    }, 2000)
  }

  return (
    <article
      className={`message-row ${isUser ? "message-user" : "message-ai"}`}
    >
      <div className="message-identity" aria-hidden="true">
        {isUser ? (
          <UserRound size={15} strokeWidth={1.8} />
        ) : (
          <Bot size={16} strokeWidth={1.8} />
        )}
      </div>
      <div className="message-content">
        <p className="message-label">{isUser ? "Kamu" : "Mini AI"}</p>
        <div
          className={`message-bubble ${message.status === "error" ? "error" : ""}`}
        >
          <p>{message.content}</p>
          {canRetry ? (
            <button
              className="retry-button"
              type="button"
              onClick={() => onRetry(message.id, message.prompt!)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Coba lagi
            </button>
          ) : null}
        </div>
        {canCopy ? (
          <button
            className={`copy-button copy-${copyStatus}`}
            type="button"
            onClick={handleCopy}
            aria-label={
              copyStatus === "copied"
                ? "Jawaban tersalin"
                : copyStatus === "error"
                  ? "Gagal menyalin jawaban, coba lagi"
                  : "Salin jawaban Mini AI"
            }
          >
            {copyStatus === "copied" ? (
              <Check size={15} aria-hidden="true" />
            ) : copyStatus === "error" ? (
              <CopyX size={15} aria-hidden="true" />
            ) : (
              <Copy size={15} aria-hidden="true" />
            )}
            <span aria-live="polite">
              {copyStatus === "copied"
                ? "Tersalin"
                : copyStatus === "error"
                  ? "Coba lagi"
                  : "Salin"}
            </span>
          </button>
        ) : null}
      </div>
    </article>
  )
}
