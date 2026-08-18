import { getDifyConfig } from "@/lib/dify/config"
import type { DifyChatRequestBody, DifyChatResponse } from "@/lib/dify/types"
import type { ChatRequest, ChatResponse } from "@/types/chat"

const DIFY_TIMEOUT_MS = 45000

export class DifyResponseError extends Error {
  readonly status: number

  constructor(message: string, status = 502) {
    super(message)
    this.name = "DifyResponseError"
    this.status = status
  }
}

function isDifyChatResponse(payload: unknown): payload is DifyChatResponse {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.answer === "string" &&
    typeof candidate.conversation_id === "string"
  )
}

export function createDifyRequestBody({
  message,
  conversationId = "",
}: ChatRequest): DifyChatRequestBody {
  return {
    inputs: {},
    query: message,
    response_mode: "blocking",
    conversation_id: conversationId,
    user: "mini-ai-user",
  }
}

export async function sendDifyMessage(
  requestBody: DifyChatRequestBody
): Promise<ChatResponse> {
  const { apiUrl, apiKey } = getDifyConfig()

  const response = await fetch(`${apiUrl}/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
    signal: AbortSignal.timeout(DIFY_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new DifyResponseError(
      "Dify returned a non-success response",
      response.status
    )
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!isDifyChatResponse(payload)) {
    throw new DifyResponseError("Dify returned an invalid response")
  }

  return {
    answer: payload.answer,
    conversationId: payload.conversation_id,
  }
}
