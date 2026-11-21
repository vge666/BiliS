import type { PresetId, Settings, SummaryOutput } from './types.ts'
import { PRESET_IDS, THINKING_MAX } from './types.ts'

export type ModelChoice = { id: string; label: string }

export const PRESETS: Record<Exclude<PresetId, 'custom'>, { label: string; baseUrl: string; model: string; hint: string; models: ModelChoice[] }> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    hint: '默认地址 https://api.deepseek.com 。思考强度打开后会启用思考模式。',
    models: [
      { id: 'deepseek-chat', label: 'deepseek-chat' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner' },
    ],
  },
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-auto',
    hint: '月之暗面。Base URL 需要带到 /v1。',
    models: [
      { id: 'moonshot-v1-auto', label: 'moonshot-v1-auto' },
      { id: 'moonshot-v1-8k', label: 'moonshot-v1-8k' },
      { id: 'moonshot-v1-32k', label: 'moonshot-v1-32k' },
      { id: 'moonshot-v1-128k', label: 'moonshot-v1-128k' },
    ],
  },
  mimo: {
    label: 'MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.6-flash',
    hint: '小米 MiMo 按量计费。滑条为 0 时关闭思考，调高后打开并提高 reasoning effort。',
    models: [
      { id: 'mimo-v2.6-flash', label: 'mimo-v2.6-flash' },
      { id: 'mimo-v2.6-pro', label: 'mimo-v2.6-pro' },
      { id: 'mimo-v2.6-pro-ultraspeed', label: 'mimo-v2.6-pro-ultraspeed' },
    ],
  },
  mimoPlan: {
    label: 'MiMo 订阅',
    baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    model: 'mimo-v2.6-flash',
    hint: '小米 MiMo Token Plan。密钥一般以 tp- 或 ttp- 开头。',
    models: [
      { id: 'mimo-v2.6-flash', label: 'mimo-v2.6-flash' },
      { id: 'mimo-v2.6-pro', label: 'mimo-v2.6-pro' },
      { id: 'mimo-v2.6-pro-ultraspeed', label: 'mimo-v2.6-pro-ultraspeed' },
    ],
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: '阿里云百炼兼容模式。思考强度大于 0 时打开 enable_thinking。',
    models: [
      { id: 'qwen-turbo', label: 'qwen-turbo' },
      { id: 'qwen-plus', label: 'qwen-plus' },
      { id: 'qwen-max', label: 'qwen-max' },
      { id: 'qwq-plus', label: 'qwq-plus' },
    ],
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    hint: '智谱开放平台。思考强度大于 0 时打开思考。',
    models: [
      { id: 'glm-4-flash', label: 'glm-4-flash' },
      { id: 'glm-4-air', label: 'glm-4-air' },
      { id: 'glm-4-plus', label: 'glm-4-plus' },
    ],
  },
  siliconflow: {
    label: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    hint: '硅基流动。模型名是控制台里的完整 ID。',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' },
    ],
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '官方接口。推理模型才会带上 reasoning_effort。',
    models: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { id: 'gpt-4o', label: 'gpt-4o' },
      { id: 'o4-mini', label: 'o4-mini' },
      { id: 'o3-mini', label: 'o3-mini' },
    ],
  },
}

export const BUILTIN_ORIGINS = [
  'https://api.deepseek.com/*',
  'https://api.moonshot.cn/*',
  'https://api.xiaomimimo.com/*',
  'https://token-plan-cn.xiaomimimo.com/*',
  'https://dashscope.aliyuncs.com/*',
  'https://open.bigmodel.cn/*',
  'https://api.siliconflow.cn/*',
  'https://api.openai.com/*',
] as const

export const DEFAULT_SETTINGS: Settings = {
  preset: 'deepseek',
  baseUrl: PRESETS.deepseek.baseUrl,
  model: PRESETS.deepseek.model,
  apiKey: '',
  output: 'plugin',
  thinking: 0,
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
  return value === 'custom' || (PRESET_IDS as readonly string[]).includes(String(value))
}

export function readOutput(value: unknown): SummaryOutput {
  return value === 'folder' || value === 'both' || value === 'plugin' ? value : 'plugin'
}

export function readThinking(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(THINKING_MAX, Math.round(parsed)))
}

export function modelsFor(preset: PresetId): ModelChoice[] {
  if (preset === 'custom') return []
  return PRESETS[preset].models
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
    output: readOutput(record.output),
    thinking: readThinking(record.thinking),
  }
}

export function applyPreset(preset: PresetId, current: Settings): Settings {
  if (preset === 'custom') return { ...current, preset }
  const next = PRESETS[preset]
  return { ...current, preset, baseUrl: next.baseUrl, model: next.model }
}
