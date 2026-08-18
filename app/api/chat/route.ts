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
  requestId: string
  conversationId: string | null
  workflowId: string | null
  input: string
  frontendPayload: unknown
  difyPayload: DifyChatRequestBody | null
  backendResponse: unknown
  status: number
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
    request_id: entry.requestId,
    conversation_id: entry.conversationId,
    workflow_id: entry.workflowId,
    user_input: entry.input,
    frontend_payload: entry.frontendPayload,
    dify_payload: entry.difyPayload,
    backend_response: entry.backendResponse,
    status: entry.status,
  }

  const serializedEntry = JSON.stringify(logEntry)
  if (entry.status >= 500) {
    console.error(serializedEntry)
    return
  }

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
  const requestId = crypto.randomUUID()
  const payload: unknown = await request.json().catch(() => null)
  const chatRequest = validateRequest(payload)

  if (!chatRequest) {
    const errorMessage = "Pesan tidak valid."
    writeChatLog({
      requestId,
      conversationId: null,
      workflowId: null,
      input: "",
      frontendPayload: payload,
      difyPayload: null,
      backendResponse: { error: errorMessage },
      status: 400,
    })
    return jsonError(errorMessage, 400)
  }

  let difyPayload: DifyChatRequestBody | null = null

  const logAndReturnError = (errorMessage: string, status: number) => {
    writeChatLog({
      requestId,
      conversationId: chatRequest.conversationId || null,
      workflowId: null,
      input: chatRequest.message,
      frontendPayload: chatRequest,
      difyPayload,
      backendResponse: { error: errorMessage },
      status,
    })
    return jsonError(errorMessage, status)
  }

  try {
    if (INTENTIONAL_BUG_PATTERN.test(chatRequest.message)) {
      throw new IntentionalLindoError()
    }

    difyPayload = createDifyRequestBody(chatRequest)
    const exchange = await sendDifyMessage(difyPayload)
    const { response } = exchange
    writeChatLog({
      requestId,
      conversationId: response.conversationId,
      workflowId: response.workflowId ?? null,
      input: chatRequest.message,
      frontendPayload: chatRequest,
      difyPayload,
      backendResponse: exchange.rawResponse,
      status: 200,
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
      console.error("Chat configuration is unavailable")
      return logAndReturnError("Layanan AI belum dikonfigurasi.", 503)
    }

    if (isTimeoutError(error)) {
      console.error("Chat provider request timed out")
      return logAndReturnError(
        "Layanan AI membutuhkan waktu terlalu lama.",
        504
      )
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
    return logAndReturnError("Gagal berkomunikasi dengan layanan AI.", 502)
  }
}
