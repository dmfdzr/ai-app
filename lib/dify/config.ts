export class DifyConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DifyConfigurationError"
  }
}

export interface DifyConfig {
  apiUrl: string
  apiKey: string
}

export function getDifyConfig(): DifyConfig {
  const apiUrl = process.env.DIFY_API_URL?.trim()
  const apiKey = process.env.DIFY_API_KEY?.trim()

  if (!apiUrl || !apiKey) {
    throw new DifyConfigurationError("Dify environment is incomplete")
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(apiUrl)
  } catch {
    throw new DifyConfigurationError("Dify API URL is invalid")
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new DifyConfigurationError("Dify API URL protocol is invalid")
  }

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
  }
}
