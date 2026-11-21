import { describe, expect, it } from 'vitest'
import { buildChunkPrompt, buildFullPrompt } from './prompts.ts'

describe('prompts', () => {
  it('includes the title and transcript and asks for json', () => {
    const prompt = buildFullPrompt({
      title: '标题甲',
      owner: 'UP甲',
      part: '上',
      desc: '简介',
      transcript: '[00:01] 你好',
    })
    expect(prompt.system).toContain('JSON')
    expect(prompt.user).toContain('标题甲')
    expect(prompt.user).toContain('[00:01] 你好')
  })

  it('marks which chunk the model is reading', () => {
    const prompt = buildChunkPrompt({
      title: '标题甲',
      owner: 'UP甲',
      part: '上',
      desc: '简介',
      transcript: '[00:01] 你好',
      index: 2,
      total: 4,
    })
    expect(prompt.user).toContain('2/4')
  })
})
