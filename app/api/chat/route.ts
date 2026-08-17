import { sendDifyMessage } from "@/lib/dify/client"
import { DifyConfigurationError } from "@/lib/dify/config"
import type { ApiError, ChatRequest, ChatResponse } from "@/types/chat"

const MAX_MESSAGE_LENGTH = 8000
const MAX_CONVERSATION_ID_LENGTH = 200

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
    return jsonError("Pesan tidak valid.", 400)
  }

  try {
    const response = await sendDifyMessage(chatRequest)
    return Response.json(response satisfies ChatResponse)
  } catch (error) {
    if (error instanceof DifyConfigurationError) {
      console.error("Chat configuration is unavailable")
      return jsonError("Layanan AI belum dikonfigurasi.", 503)
    }

    if (isTimeoutError(error)) {
      console.error("Chat provider request timed out")
      return jsonError("Layanan AI membutuhkan waktu terlalu lama.", 504)
    }

    console.error("Chat provider request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status:
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined,
    })
    return jsonError("Gagal berkomunikasi dengan layanan AI.", 502)
  }
}
