import { describe, expect, it } from 'vitest'
import {
  chunkTranscript,
  descriptionIsUsable,
  formatTimestamp,
  parseCues,
  pickTrack,
  tracksFromBlob,
  urlBelongsToVideo,
} from './subtitle.ts'
import type { SubtitleTrack } from './types.ts'

const track = (lan: string, lanDoc = '', aiType = 0): SubtitleTrack => ({
  id: lan,
  lan,
  lanDoc,
  url: `https://example.com/${lan}`,
  aiType,
})

describe('subtitle helpers', () => {
  it('formats timestamps', () => {
    expect(formatTimestamp(0)).toBe('00:00')
    expect(formatTimestamp(65)).toBe('01:05')
    expect(formatTimestamp(3661)).toBe('1:01:01')
  })

  it('prefers a human Chinese track over an AI track', () => {
    const picked = pickTrack([track('ai-zh', '中文（自动生成）', 1), track('zh-CN', '中文')])
    expect(picked?.lan).toBe('zh-CN')
    expect(pickTrack([track('en'), track('ai-zh', '中文（自动生成）', 1)])?.lan).toBe('ai-zh')
  })

  it('keeps only subtitle urls that belong to this aid and cid', () => {
    expect(urlBelongsToVideo('//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/1234abcd', '12', '34')).toBe(true)
    expect(urlBelongsToVideo('//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/12345abcd', '12', '34')).toBe(false)
    expect(urlBelongsToVideo('//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/9999abcd', '12', '34')).toBe(false)
    expect(urlBelongsToVideo('//aisubtitle.hdslb.com/bfs/subtitle/abc.json', '12', '34')).toBe(true)
  })

  it('pulls subtitle urls out of a dm view blob', () => {
    const blob = 'noise https:\\/\\/aisubtitle.hdslb.com\\/bfs\\/ai_subtitle\\/prod\\/1234abcd and https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/9999zzzz'
    const tracks = tracksFromBlob(blob, '12', '34')
    expect(tracks).toHaveLength(1)
    expect(tracks[0]?.url).toContain('1234abcd')
    expect(tracks[0]?.lan).toBe('ai-zh')
  })

  it('parses cue bodies and drops empty lines', () => {
    expect(parseCues({ body: [{ from: 65, content: ' 世界 ' }, { from: 0, content: '你好' }, { from: 3, content: '  ' }] })).toEqual([
      { from: 0, content: '你好' },
      { from: 65, content: '世界' },
    ])
  })

  it('splits long transcripts on cue boundaries and keeps every line', () => {
    const cues = Array.from({ length: 10 }, (_, index) => ({ from: index * 10, content: '字'.repeat(30) }))
    const chunks = chunkTranscript(cues, 80)
    expect(chunks.length).toBeGreaterThan(1)
    const joined = chunks.join('\n')
    for (const cue of cues) expect(joined).toContain(cue.content)
    expect(chunkTranscript([{ from: 0, content: '超'.repeat(100) }], 10)).toHaveLength(1)
  })

  it('treats a short description as not enough to summarize', () => {
    expect(descriptionIsUsable('太短')).toBe(false)
    expect(descriptionIsUsable('这是一段足够用来兜底总结的视频简介内容。')).toBe(true)
  })
})
