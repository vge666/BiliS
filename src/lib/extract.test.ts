import { describe, expect, it } from 'vitest'
import { extractVideo, fetchVideoMeta } from './extract.ts'
import type { BiliClient } from './types.ts'

const view = {
  code: 0,
  data: {
    bvid: 'BV1aaaaaaaaa',
    aid: 100,
    cid: 200,
    title: '测试视频',
    desc: '这是一个足够长的简介用来兜底总结视频内容。',
    owner: { name: '测试UP' },
    duration: 120,
    pages: [
      { cid: 200, page: 1, part: '上', duration: 60 },
      { cid: 201, page: 2, part: '下', duration: 60 },
    ],
  },
}

const nav = {
  code: 0,
  data: {
    isLogin: true,
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/imgKey.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/subKey.png',
    },
  },
}

function json(value: unknown, status = 200) {
  return { status, body: JSON.stringify(value) }
}

function client(handler: (url: string) => { status: number; body: string }): BiliClient & { urls: string[] } {
  const urls: string[] = []
  return {
    urls,
    async get(url: string) {
      urls.push(url)
      if (url.includes('/x/player/v2') && !url.includes('/x/player/wbi/v2')) {
        throw new Error('unsigned player api was called')
      }
      return handler(url)
    },
  }
}

describe('extractVideo', () => {
  it('selects the requested part and prefers the human subtitle', async () => {
    const api = client((url) => {
      if (url.includes('/x/web-interface/view')) return json(view)
      if (url.includes('/x/web-interface/nav')) return json(nav)
      if (url.includes('/x/player/wbi/v2')) {
        return json({
          code: 0,
          data: {
            subtitle: {
              subtitles: [
                {
                  id: 1,
                  lan: 'ai-zh',
                  lan_doc: '中文（自动生成）',
                  subtitle_url: '//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/100201abcdef',
                  ai_type: 1,
                },
                {
                  id: 2,
                  lan: 'zh-CN',
                  lan_doc: '中文',
                  subtitle_url: '//aisubtitle.hdslb.com/bfs/subtitle/human.json',
                },
              ],
            },
          },
        })
      }
      if (url.includes('human.json')) return json({ body: [{ from: 0, content: '你好' }, { from: 65, content: '世界' }] })
      throw new Error(url)
    })
    const result = await extractVideo(api, { bvid: 'BV1aaaaaaaaa', page: 2 }, () => 1_700_000_000)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.meta.page).toMatchObject({ cid: 201, part: '下' })
    expect(result.track.lan).toBe('zh-CN')
    expect(result.cues.map((cue) => cue.content)).toEqual(['你好', '世界'])
    const player = api.urls.find((url) => url.includes('/x/player/wbi/v2')) ?? ''
    expect(player).toContain('aid=100')
    expect(player).toContain('cid=201')
    expect(player).toContain('w_rid=')
  })

  it('falls back to dm view urls when the player list is empty', async () => {
    const api = client((url) => {
      if (url.includes('/x/web-interface/view')) return json(view)
      if (url.includes('/x/web-interface/nav')) return json({ ...nav, data: { ...nav.data, isLogin: false } })
      if (url.includes('/x/player/wbi/v2')) return json({ code: 0, data: { subtitle: { subtitles: [] } } })
      if (url.includes('/x/v2/dm/view')) {
        return { status: 200, body: 'https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/100200abcd' }
      }
      if (url.includes('100200abcd')) return json({ body: [{ from: 1, content: '兜底字幕' }] })
      throw new Error(url)
    })
    const result = await extractVideo(api, { bvid: 'BV1aaaaaaaaa', page: 1 }, () => 10)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.cues[0]?.content).toBe('兜底字幕')
    expect(result.track.lan).toBe('ai-zh')
  })

  it('asks for login when both sources are empty and the viewer is logged out', async () => {
    const api = client((url) => {
      if (url.includes('/x/web-interface/view')) return json(view)
      if (url.includes('/x/web-interface/nav')) return json({ ...nav, data: { ...nav.data, isLogin: false } })
      if (url.includes('/x/player/wbi/v2')) return json({ code: 0, data: { subtitle: { subtitles: [] } } })
      if (url.includes('/x/v2/dm/view')) return { status: 200, body: '' }
      throw new Error(url)
    })
    const result = await extractVideo(api, { bvid: 'BV1aaaaaaaaa', page: 1 }, () => 10)
    expect(result).toMatchObject({ status: 'no-subtitle', isLogin: false })
  })

  it('reports an error when both subtitle sources fail', async () => {
    const api = client((url) => {
      if (url.includes('/x/web-interface/view')) return json(view)
      if (url.includes('/x/web-interface/nav')) return { status: 412, body: '' }
      if (url.includes('/x/v2/dm/view')) return { status: 500, body: '' }
      throw new Error(url)
    })
    const result = await extractVideo(api, { bvid: 'BV1aaaaaaaaa', page: 1 }, () => 10)
    expect(result.status).toBe('error')
    if (result.status === 'error') expect(result.message).toContain('412')
  })

  it('falls back to the first part when the requested page does not exist', async () => {
    const api = client((url) => {
      if (url.includes('/x/web-interface/view')) return json(view)
      throw new Error(url)
    })
    const meta = await fetchVideoMeta(api, { bvid: 'BV1aaaaaaaaa', page: 9 })
    expect(meta.page.page).toBe(1)
  })
})
