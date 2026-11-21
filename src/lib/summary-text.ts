import { formatTimestamp } from './subtitle.ts'
import type { StoredSummary, VideoMeta } from './types.ts'

export function summaryFileName(meta: Pick<VideoMeta, 'title' | 'bvid' | 'aid' | 'page'>): string {
  const safeTitle = meta.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || '未命名视频'
  const id = meta.bvid || `av${meta.aid}`
  return `${safeTitle}-${id}-P${meta.page.page}.md`
}

export function summaryToMarkdown(meta: Pick<VideoMeta, 'title' | 'owner' | 'bvid' | 'aid' | 'page'>, stored: StoredSummary): string {
  const lines = [`# ${meta.title}`, '']
  if (meta.owner) lines.push(`- UP 主：${meta.owner}`)
  if (meta.page.part) lines.push(`- 分P：${meta.page.part}`)
  lines.push(`- 视频：${meta.bvid || `av${meta.aid}`}`)
  if (!stored.parsed.ok) return [...lines, '', stored.parsed.raw].join('\n')
  const { oneLiner, points, chapters } = stored.parsed.summary
  lines.push('', '## 一句话', '', oneLiner, '', '## 要点', '')
  for (const point of points) lines.push(`- ${point}`)
  if (chapters.length > 0) {
    lines.push('', '## 时间线', '')
    for (const chapter of chapters) {
      lines.push(`### ${formatTimestamp(chapter.start)} ${chapter.title}`, '', chapter.summary, '')
    }
  }
  if (stored.source === 'description') lines.push('', '这份总结只来自标题和简介，不是根据字幕。')
  return lines.join('\n').trim() + '\n'
}

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
