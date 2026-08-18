import {
  createDifyRequestBody,
  sendDifyMessage,
} from "@/lib/dify/client"
import { DifyConfigurationError } from "@/lib/dify/config"
import type { DifyChatRequestBody } from "@/lib/dify/types"
import type { ApiError, ChatRequest, ChatResponse } from "@/types/chat"

const MAX_MESSAGE_LENGTH = 8000
const MAX_CONVERSATION_ID_LENGTH = 200
const INTENTIONAL_BUG_PATTERN = /\blindo\b/i

interface ChatLogEntry {
  conversationId: string | null
  input: string
  backendResponse: unknown
}

class IntentionalLindoError extends Error {
  constructor() {
    super('Intentional test failure triggered by keyword "Lindo"')
    this.name = "IntentionalLindoError"
  }
}

function writeChatLog(entry: ChatLogEntry): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    conversation_id: entry.conversationId,
    user_input: entry.input,
    backend_response: entry.backendResponse,
  }

  const serializedEntry = JSON.stringify(logEntry, null, 2)
  console.info(serializedEntry)
}

function validateRequest(payload: unknown): ChatRequest | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const message =
    typeof candidate.message === "string" ? candidate.message.trim() : ""
  const conversationId =
    typeof candidate.conversationId === "string"
      ? candidate.conversationId.trim()
      : ""

  if (
    !message ||
    message.length > MAX_MESSAGE_LENGTH ||
    conversationId.length > MAX_CONVERSATION_ID_LENGTH
  ) {
    return null
  }

  return { message, conversationId }
}

function jsonError(error: string, status: number) {
  const body = { error } satisfies ApiError
  return Response.json(body, { status })
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError"
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null)
  const chatRequest = validateRequest(payload)

  if (!chatRequest) {
    const errorMessage = "Pesan tidak valid."
    writeChatLog({
      conversationId: null,
      input: "",
      backendResponse: { error: errorMessage },
    })
    return jsonError(errorMessage, 400)
  }

  const logAndReturnError = (errorMessage: string, status: number) => {
    writeChatLog({
      conversationId: chatRequest.conversationId || null,
      input: chatRequest.message,
      backendResponse: { error: errorMessage },
    })
    return jsonError(errorMessage, status)
  }

  try {
    if (INTENTIONAL_BUG_PATTERN.test(chatRequest.message)) {
      throw new IntentionalLindoError()
    }

    const difyPayload: DifyChatRequestBody = createDifyRequestBody(chatRequest)
    const response = await sendDifyMessage(difyPayload)
    writeChatLog({
      conversationId: response.conversationId,
      input: chatRequest.message,
      backendResponse: {
        answer: response.answer,
        conversation_id: response.conversationId,
      },
    })
    return Response.json(response satisfies ChatResponse)
  } catch (error) {
    if (error instanceof IntentionalLindoError) {
      return logAndReturnError(
        "Terjadi kesalahan internal yang disengaja.",
        500
      )
    }

    if (error instanceof DifyConfigurationError) {
      return logAndReturnError("Layanan AI belum dikonfigurasi.", 503)
    }

    if (isTimeoutError(error)) {
      return logAndReturnError(
        "Layanan AI membutuhkan waktu terlalu lama.",
        504
      )
    }

    return logAndReturnError("Gagal berkomunikasi dengan layanan AI.", 502)
  }
}
