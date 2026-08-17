"use client"

import { MessageSquareText, RotateCcw, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import { useChat } from "@/hooks/use-chat"

export function ChatShell() {
  const [isResetting, setIsResetting] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    messages,
    input,
    setInput,
    isLoading,
    textareaRef,
    sendMessage,
    retryMessage,
    resetConversation,
  } = useChat()
  const canReset = messages.length > 0 || input.length > 0

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  function handleReset() {
    if (!canReset || isLoading || isResetting) {
      return
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resetConversation()
      return
    }

    setIsResetting(true)
    resetTimerRef.current = setTimeout(() => {
      resetConversation()
      setIsResetting(false)
      resetTimerRef.current = null
    }, 180)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conversation">
        Lewati ke percakapan
      </a>

      <header className="app-header">
        <div className="brand" aria-label="Mini AI">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={18} strokeWidth={1.8} />
          </span>
          <span className="brand-name">Mini AI</span>
          <span className="brand-edition">Chat 01</span>
        </div>

        <button
          className="reset-button"
          type="button"
          disabled={!canReset || isLoading || isResetting}
          onClick={handleReset}
          aria-label="Reset percakapan dan mulai chat baru"
        >
          <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </header>

      <main className="chat-workspace">
        <section
          id="conversation"
          className={`conversation-panel ${isResetting ? "is-resetting" : ""}`}
          aria-label="Percakapan dengan Mini AI"
        >
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <MessageSquareText size={24} strokeWidth={1.7} />
              </div>
              <p className="empty-kicker">Percakapan baru</p>
              <h1>Apa yang ingin kamu pahami hari ini?</h1>
              <p className="empty-copy">
                Tulis pertanyaan, minta ringkasan, atau uraikan masalah yang
                sedang kamu kerjakan.
              </p>
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              onRetry={retryMessage}
            />
          )}
        </section>

        <ChatComposer
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          textareaRef={textareaRef}
          onSend={sendMessage}
        />
      </main>
    </div>
  )
}
