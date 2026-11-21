import { chatCompletionsUrl } from './endpoints.ts'
import { thinkingFields } from './thinking.ts'

export type ChatMessage = {
  role: 'system' | 'user'
  content: string
}

function readContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text
      return ''
    })
    .join('')
}

function formatApiError(status: number, text: string): string {
  let detail = ''
  try {
    const body = JSON.parse(text) as { error?: { message?: string }; message?: string }
    detail = body.error?.message || body.message || ''
  } catch {
    detail = text.slice(0, 180)
  }
  detail = detail
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')
    .replace(/\bt?tp-[A-Za-z0-9_-]+/g, 'tp-***')
    .replace(/Bearer\s+\S+/gi, 'Bearer ***')
  return detail ? `接口返回 ${status}：${detail}` : `接口返回 ${status}`
}

export function requestHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  try {
    if (new URL(baseUrl).hostname.endsWith('xiaomimimo.com')) headers['api-key'] = apiKey
  } catch {
    // An unusable address is reported when the request itself fails.
  }
  return headers
}

function requestBody(baseUrl: string, model: string, messages: ChatMessage[], thinking: number): Record<string, unknown> {
  return {
    model,
    temperature: 0.2,
    messages,
    ...thinkingFields(baseUrl, model, thinking),
  }
}

export async function chatComplete(options: {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  thinking?: number
  fetchImpl?: typeof fetch
}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(chatCompletionsUrl(options.baseUrl), {
      method: 'POST',
      headers: requestHeaders(options.baseUrl, options.apiKey),
      body: JSON.stringify(requestBody(options.baseUrl, options.model, options.messages, options.thinking ?? 0)),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('请求超时。')
    throw new Error('连不上这个接口。检查 Base URL、网络，或是否已允许访问该网站。')
  }
  const text = await response.text()
  if (!response.ok) throw new Error(formatApiError(response.status, text))
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('接口没有返回 JSON')
  }
  const content = readContent(
    (parsed as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content,
  )
  if (!content.trim()) throw new Error('接口没有返回总结内容')
  return content
}
