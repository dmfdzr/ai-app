import { ArrowUp } from "lucide-react"
import type {
  Dispatch,
  FormEvent,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from "react"

const MAX_MESSAGE_LENGTH = 8000

interface ChatComposerProps {
  input: string
  setInput: Dispatch<SetStateAction<string>>
  isLoading: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onSend: (message: string) => void
}

export function ChatComposer({
  input,
  setInput,
  isLoading,
  textareaRef,
  onSend,
}: ChatComposerProps) {
  const canSend = input.trim().length > 0 && !isLoading

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSend) {
      onSend(input)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend(input)
      }
    }
  }

  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={handleSubmit} aria-busy={isLoading}>
        <label className="sr-only" htmlFor="chat-message">
          Pesan untuk Mini AI
        </label>
        <textarea
          ref={textareaRef}
          id="chat-message"
          name="message"
          value={input}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Tulis pesanmu..."
          aria-describedby="composer-help"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="send-button"
          type="submit"
          disabled={!canSend}
          aria-label={isLoading ? "Mini AI sedang berpikir" : "Kirim pesan"}
        >
          <ArrowUp size={19} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </form>
      <p id="composer-help" className="composer-help">
        Enter untuk kirim · Shift + Enter untuk baris baru
      </p>
    </div>
  )
}
