import { describe, expect, it } from 'vitest'
import { summaryFileName } from './summary-text.ts'
import { thinkingFields } from './thinking.ts'
import { readThinking } from './endpoints.ts'

describe('thinkingFields', () => {
  it('turns MiMo thinking off at zero and raises effort after that', () => {
    expect(thinkingFields('https://api.xiaomimimo.com/v1', 'mimo-v2.6-flash', 0)).toEqual({
      thinking: { type: 'disabled' },
    })
    expect(thinkingFields('https://token-plan-cn.xiaomimimo.com/v1', 'mimo-v2.6-pro', 2)).toEqual({
      thinking: { type: 'enabled' },
      reasoning_effort: 'medium',
    })
    expect(thinkingFields('https://api.xiaomimimo.com/v1', 'mimo-v2.6-pro', 4)).toMatchObject({
      reasoning_effort: 'high',
    })
  })

  it('leaves ordinary chat models alone until the slider moves', () => {
    expect(thinkingFields('https://api.deepseek.com', 'deepseek-chat', 0)).toEqual({})
    expect(thinkingFields('https://api.openai.com/v1', 'gpt-4o-mini', 3)).toEqual({})
    expect(thinkingFields('https://api.openai.com/v1', 'o4-mini', 3)).toEqual({ reasoning_effort: 'high' })
    expect(thinkingFields('https://dashscope.aliyuncs.com/compatible-mode/v1', 'qwen-plus', 1)).toEqual({
      enable_thinking: true,
    })
  })

  it('clamps stored thinking levels', () => {
    expect(readThinking(9)).toBe(4)
    expect(readThinking('nope')).toBe(0)
  })
})

describe('summaryFileName', () => {
  it('removes characters that folders cannot store', () => {
    expect(
      summaryFileName({
        title: 'a/b:c',
        bvid: 'BV1aaaaaaaaa',
        aid: 1,
        page: { cid: 1, page: 2, part: '下', duration: 1 },
      }),
    ).toBe('a b c-BV1aaaaaaaaa-P2.md')
  })
})
