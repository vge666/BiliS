import type { Cue, SubtitleTrack } from './types.ts'

const SUBTITLE_URL = /(?:https?:)?\/\/[a-z0-9.-]*hdslb\.com\/bfs\/(?:ai_)?subtitle\/[^\s"'<>\\)]+/gi

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function absoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('//')) return `https:${url}`
  return url
}

export function urlBelongsToVideo(url: string, aid: string, cid: string): boolean {
  const filename = decodeURIComponent((url.split('?')[0] ?? '').split('/').pop() ?? '')
  const prefix = `${aid}${cid}`
  if (filename.startsWith(prefix)) {
    const next = filename[prefix.length]
    return next === undefined || !/\d/.test(next)
  }
  return !url.includes('/ai_subtitle/prod/')
}

function isAi(track: SubtitleTrack): boolean {
  const lan = track.lan.toLowerCase()
  return lan.startsWith('ai-') || track.aiType > 0 || /自动|AI/i.test(track.lanDoc)
}

function rank(track: SubtitleTrack): number {
  const lan = track.lan.toLowerCase()
  if (!isAi(track) && (lan === 'zh-cn' || lan === 'zh-hans' || lan === 'zh')) return 0
  if (!isAi(track) && lan.startsWith('zh')) return 1
  if (lan === 'ai-zh' || (isAi(track) && lan.includes('zh'))) return 2
  if (lan.includes('zh')) return 3
  return 4
}

export function pickTrack(tracks: SubtitleTrack[]): SubtitleTrack | null {
  if (tracks.length === 0) return null
  return [...tracks].sort((left, right) => rank(left) - rank(right))[0] ?? null
}

export function tracksFromPlayer(list: unknown, aid: string, cid: string): SubtitleTrack[] {
  if (!Array.isArray(list)) return []
  const tracks: SubtitleTrack[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const url = String(record.subtitle_url ?? record.subtitleUrl ?? '')
    if (!url || !urlBelongsToVideo(url, aid, cid)) continue
    tracks.push({
      id: String(record.id ?? url),
      lan: String(record.lan ?? ''),
      lanDoc: String(record.lan_doc ?? record.lanDoc ?? ''),
      url,
      aiType: Number(record.ai_type ?? record.aiType ?? 0) || 0,
    })
  }
  return tracks
}

export function tracksFromBlob(blob: string, aid: string, cid: string): SubtitleTrack[] {
  const normalized = blob.replace(/\\\//g, '/')
  const matches = normalized.match(SUBTITLE_URL) ?? []
  const urls = [...new Set(matches.map((url) => url.replace(/[),.;]+$/g, '')))]
  return urls
    .filter((url) => urlBelongsToVideo(url, aid, cid))
    .map((url, index) => ({
      id: `dm-${index}`,
      lan: url.includes('ai_subtitle') ? 'ai-zh' : 'zh',
      lanDoc: url.includes('ai_subtitle') ? '中文（自动生成）' : '中文',
      url,
      aiType: url.includes('ai_subtitle') ? 1 : 0,
    }))
}

export function parseCues(payload: unknown): Cue[] {
  if (!payload || typeof payload !== 'object') return []
  const record = payload as { body?: unknown; data?: { body?: unknown } }
  const body = Array.isArray(record.body) ? record.body : record.data?.body
  if (!Array.isArray(body)) return []
  const cues: Cue[] = []
  for (const item of body) {
    if (!item || typeof item !== 'object') continue
    const cue = item as { from?: unknown; content?: unknown }
    const from = Number(cue.from)
    const content = String(cue.content ?? '').trim()
    if (!content || !Number.isFinite(from)) continue
    cues.push({ from, content })
  }
  cues.sort((left, right) => left.from - right.from)
  return cues
}

export function chunkTranscript(cues: Cue[], limit = 12_000): string[] {
  const lines = cues
    .map((cue) => `[${formatTimestamp(cue.from)}] ${cue.content.trim()}`)
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const chunks: string[] = []
  let current: string[] = []
  let size = 0
  for (const line of lines) {
    const next = size === 0 ? line.length : size + 1 + line.length
    if (size > 0 && next > limit) {
      chunks.push(current.join('\n'))
      current = [line]
      size = line.length
      continue
    }
    current.push(line)
    size = next
  }
  if (current.length > 0) chunks.push(current.join('\n'))
  return chunks
}

export const MIN_DESCRIPTION_LENGTH = 20

export function descriptionIsUsable(desc: string): boolean {
  return desc.replace(/\s+/g, '').length >= MIN_DESCRIPTION_LENGTH
}
