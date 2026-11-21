import { describe, expect, it } from 'vitest'
import { chatCompletionsUrl, modelsFor, originPattern } from './endpoints.ts'

describe('endpoints', () => {
  it('appends the chat completions path once', () => {
    expect(chatCompletionsUrl('https://api.deepseek.com')).toBe('https://api.deepseek.com/chat/completions')
    expect(chatCompletionsUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions')
    expect(chatCompletionsUrl('https://example.com/v1/chat/completions')).toBe('https://example.com/v1/chat/completions')
  })

  it('offers MiMo models for the MiMo presets', () => {
    expect(modelsFor('mimo').map((model) => model.id)).toContain('mimo-v2.6-pro')
    expect(modelsFor('custom')).toEqual([])
  })

  it('rejects non-https origins', () => {
    expect(originPattern('https://api.example.com/v1')).toBe('https://api.example.com/*')
    expect(() => originPattern('http://api.example.com')).toThrow(/https/)
  })
})
