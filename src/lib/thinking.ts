import { THINKING_MAX } from './types.ts'

export function clampThinking(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(THINKING_MAX, Math.round(value)))
}

function effort(level: number): 'low' | 'medium' | 'high' {
  if (level <= 1) return 'low'
  if (level === 2) return 'medium'
  return 'high'
}

function hostname(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname
  } catch {
    return ''
  }
}

/** Maps the slider onto the fields each provider actually accepts. */
export function thinkingFields(baseUrl: string, model: string, level: number): Record<string, unknown> {
  const thinking = clampThinking(level)
  const host = hostname(baseUrl)
  if (host.endsWith('xiaomimimo.com')) {
    if (thinking === 0) return { thinking: { type: 'disabled' } }
    return { thinking: { type: 'enabled' }, reasoning_effort: effort(thinking) }
  }
  if (thinking === 0) return {}
  if (host === 'api.deepseek.com') return { thinking: { type: 'enabled' }, reasoning_effort: effort(thinking) }
  if (host === 'api.openai.com' || host.endsWith('.openai.com')) {
    if (!/^(o\d|gpt-5)/i.test(model)) return {}
    return { reasoning_effort: effort(thinking) }
  }
  if (host.endsWith('dashscope.aliyuncs.com')) return { enable_thinking: true }
  if (host.endsWith('bigmodel.cn')) return { thinking: { type: 'enabled' } }
  if (host.endsWith('siliconflow.cn')) return { enable_thinking: true, reasoning_effort: effort(thinking) }
  if (host.endsWith('moonshot.cn')) return {}
  return { reasoning_effort: effort(thinking) }
}
