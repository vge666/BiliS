import { describe, expect, it } from 'vitest'
import { classifyLocation } from './video-url.ts'

describe('classifyLocation', () => {
  it('reads a BV url and the current part', () => {
    const result = classifyLocation('https://www.bilibili.com/video/BV1xx411c7mD/?p=2&spm_id=1')
    expect(result).toEqual({ kind: 'video', target: { bvid: 'BV1xx411c7mD', page: 2 } })
  })

  it('normalizes a lowercase bv prefix and reads av urls', () => {
    expect(classifyLocation('https://bilibili.com/video/bv1xx411c7mD')).toEqual({
      kind: 'video',
      target: { bvid: 'BV1xx411c7mD', page: 1 },
    })
    expect(classifyLocation('https://m.bilibili.com/video/av170001?p=3')).toEqual({
      kind: 'video',
      target: { aid: '170001', page: 3 },
    })
  })

  it('separates other bilibili pages from unrelated sites', () => {
    expect(classifyLocation('https://www.bilibili.com/bangumi/play/ep123').kind).toBe('bilibili')
    expect(classifyLocation('https://live.bilibili.com/123').kind).toBe('bilibili')
    expect(classifyLocation('https://example.com/video/BV1xx411c7mD').kind).toBe('other')
    expect(classifyLocation('not a url').kind).toBe('invalid')
  })
})
