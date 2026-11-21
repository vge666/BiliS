import type { PresetId, Settings } from './types.ts'

export const PRESETS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    hint: '默认地址 https://api.deepseek.com ，模型 deepseek-chat。',
  },
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-auto',
    hint: '月之暗面。Base URL 需要带到 /v1。',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '官方接口。Base URL 需要带到 /v1。',
  },
} as const

export const BUILTIN_ORIGINS = [
  'https://api.deepseek.com/*',
  'https://api.moonshot.cn/*',
  'https://api.openai.com/*',
] as const

export const DEFAULT_SETTINGS: Settings = {
  preset: 'deepseek',
  baseUrl: PRESETS.deepseek.baseUrl,
  model: PRESETS.deepseek.model,
  apiKey: '',
}

export function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  if (base.endsWith('/chat/completions')) return base
  return `${base}/chat/completions`
}

export function originPattern(baseUrl: string): string {
  let url: URL
  try {
    url = new URL(baseUrl.trim())
  } catch {
    throw new Error('接口地址不是合法的 URL')
  }
  if (url.protocol !== 'https:') throw new Error('接口地址需要以 https:// 开头')
  if (!url.host) throw new Error('接口地址缺少主机名')
  return `${url.protocol}//${url.host}/*`
}

export function isBuiltinOrigin(pattern: string): boolean {
  return (BUILTIN_ORIGINS as readonly string[]).includes(pattern)
}

export function isPreset(value: unknown): value is PresetId {
  return value === 'deepseek' || value === 'kimi' || value === 'openai' || value === 'custom'
}

export function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS }
  const record = value as Partial<Settings>
  const preset = isPreset(record.preset) ? record.preset : 'deepseek'
  const fallback = preset === 'custom' ? PRESETS.deepseek : PRESETS[preset]
  return {
    preset,
    baseUrl: typeof record.baseUrl === 'string' && record.baseUrl.trim() ? record.baseUrl.trim() : fallback.baseUrl,
    model: typeof record.model === 'string' && record.model.trim() ? record.model.trim() : fallback.model,
    apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
  }
}

export function applyPreset(preset: PresetId, current: Settings): Settings {
  if (preset === 'custom') return { ...current, preset }
  const next = PRESETS[preset]
  return { ...current, preset, baseUrl: next.baseUrl, model: next.model }
}
