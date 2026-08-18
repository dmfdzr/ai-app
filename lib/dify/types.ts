export interface DifyChatRequestBody {
  inputs: Record<string, never>
  query: string
  response_mode: "blocking"
  conversation_id: string
  user: string
}

export interface DifyChatResponse {
  answer: string
  conversation_id: string
}
