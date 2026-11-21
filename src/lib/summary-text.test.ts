import { describe, expect, it } from 'vitest'
import { summaryToText } from './summary-text.ts'

const meta = { title: '测试视频', owner: '测试UP', page: { cid: 1, page: 1, part: '上', duration: 10 } }

describe('summaryToText', () => {
  it('includes chapters and a description disclaimer', () => {
    const text = summaryToText(meta, {
      source: 'description',
      createdAt: 1,
      parsed: { ok: true, summary: { oneLiner: '一句话', points: ['甲'], chapters: [] } },
    })
    expect(text).toContain('一句话')
    expect(text).toContain('· 甲')
    expect(text).toContain('不是根据字幕')
  })
})
