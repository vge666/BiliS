import { formatTimestamp } from './subtitle.ts'
import type { StoredSummary, VideoMeta } from './types.ts'

export function summaryToText(meta: Pick<VideoMeta, 'title' | 'owner' | 'page'>, stored: StoredSummary): string {
  const heading = [meta.title, meta.owner ? `UP 主：${meta.owner}` : '', meta.page.part ? `分P：${meta.page.part}` : ''].filter(Boolean)
  if (!stored.parsed.ok) return [...heading, '', stored.parsed.raw].join('\n')
  const { oneLiner, points, chapters } = stored.parsed.summary
  const body = [oneLiner, '', '要点', ...points.map((point) => `· ${point}`)]
  if (chapters.length > 0) {
    body.push('', '时间线')
    for (const chapter of chapters) {
      body.push(`${formatTimestamp(chapter.start)} ${chapter.title}`, chapter.summary)
    }
  }
  if (stored.source === 'description') body.push('', '这份总结只来自标题和简介，不是根据字幕。')
  return [...heading, '', ...body].join('\n')
}
