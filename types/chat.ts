export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status?: "error"
  prompt?: string
}

export interface ChatRequest {
  message: string
  conversationId?: string
}

export interface ChatResponse {
  answer: string
  conversationId: string
}

export interface ApiError {
  error: string
}
