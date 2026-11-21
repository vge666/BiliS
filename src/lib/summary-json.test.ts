import { describe, expect, it } from 'vitest'
import { alignChapters, parseSummaryJson } from './summary-json.ts'

describe('parseSummaryJson', () => {
  it('reads fenced json and clock timestamps', () => {
    const parsed = parseSummaryJson('说明\n```json\n{"oneLiner":"一句话","points":["甲"],"chapters":[{"start":"01:02","title":"开场","summary":"你好"}]}\n```')
    expect(parsed).toEqual({
      ok: true,
      summary: { oneLiner: '一句话', points: ['甲'], chapters: [{ start: 62, title: '开场', summary: '你好' }] },
    })
  })

  it('keeps the raw text when the model does not return the shape', () => {
    expect(parseSummaryJson('今天天气不错')).toEqual({ ok: false, raw: '今天天气不错' })
  })

  it('snaps a chapter start onto a nearby cue', () => {
    const aligned = alignChapters(
      { oneLiner: '概括', points: ['甲'], chapters: [{ start: 66, title: '后段', summary: '内容' }] },
      [{ from: 65.4, content: '世界' }],
    )
    expect(aligned.chapters[0]?.start).toBe(65)
  })
})
