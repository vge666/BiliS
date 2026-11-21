import { describe, expect, it } from 'vitest'
import { summarizeMaterial } from './summarize.ts'
import type { VideoMeta } from './types.ts'

const meta: VideoMeta = {
  bvid: 'BV1aaaaaaaaa',
  aid: 1,
  title: '测试视频',
  desc: '这是一个足够长的简介用来兜底总结视频内容。',
  owner: '测试UP',
  page: { cid: 2, page: 1, part: '上', duration: 80 },
  pages: [{ cid: 2, page: 1, part: '上', duration: 80 }],
}

function response(content: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status })
}

describe('summarizeMaterial', () => {
  it('merges chunked subtitle summaries and snaps chapter times', async () => {
    const bodies: string[] = []
    let call = 0
    const labels: string[] = []
    const parsed = await summarizeMaterial({
      meta,
      source: 'subtitle',
      cues: [
        { from: 0, content: '甲'.repeat(40) },
        { from: 100, content: '乙'.repeat(40) },
      ],
      settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'sk-secret' },
      chunkLimit: 50,
      onProgress: (progress) => labels.push(progress.label),
      fetchImpl: async (_url, init) => {
        bodies.push(String(init?.body))
        call += 1
        if (call < 3) {
          return response({
            oneLiner: `段${call}`,
            points: [`要点${call}`],
            chapters: [{ start: call === 1 ? 0 : 101, title: `章${call}`, summary: '段内容' }],
          })
        }
        return response({ oneLiner: '合并', points: ['总要点'], chapters: [{ start: 0, title: '章', summary: '全片' }] })
      },
    })
    expect(call).toBe(3)
    expect(labels.at(-1)).toContain('3/3')
    expect(bodies[2]).toContain('段1')
    expect(parsed).toMatchObject({ ok: true, summary: { oneLiner: '合并' } })
    expect(bodies.join('')).not.toContain('sk-secret')
  })

  it('drops invented chapters when summarizing from the description', async () => {
    const parsed = await summarizeMaterial({
      meta,
      source: 'description',
      settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'key' },
      fetchImpl: async () =>
        response({ oneLiner: '只看简介', points: ['甲'], chapters: [{ start: 10, title: '假章节', summary: '不该出现' }] }),
    })
    expect(parsed).toEqual({ ok: true, summary: { oneLiner: '只看简介', points: ['甲'], chapters: [] } })
  })

  it('hides secrets in api errors', async () => {
    await expect(
      summarizeMaterial({
        meta,
        source: 'description',
        settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'sk-secret' },
        fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'bad key sk-abc123' } }), { status: 401 }),
      }),
    ).rejects.toThrow(/401/)
    await expect(
      summarizeMaterial({
        meta,
        source: 'description',
        settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'sk-secret' },
        fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'bad key sk-abc123' } }), { status: 401 }),
      }),
    ).rejects.not.toThrow(/sk-abc123/)
  })
})
