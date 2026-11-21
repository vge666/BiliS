import type { Chapter, Cue, ParsedSummary, Summary } from './types.ts'

function parseStart(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.floor(Number(trimmed))
  const parts = trimmed.split(':').map((part) => Number(part))
  if (parts.some((part) => !Number.isFinite(part))) return null
  if (parts.length === 2) return Math.floor((parts[0] ?? 0) * 60 + (parts[1] ?? 0))
  if (parts.length === 3) return Math.floor((parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0))
  return null
}

function parseChapter(value: unknown): Chapter | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const start = parseStart(record.start)
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  if (start === null || !title) return null
  return { start, title, summary }
}

function extractJson(text: string): string | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() || trimmed
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return source.slice(start, end + 1)
}

export function parseSummaryJson(text: string): ParsedSummary {
  const candidate = extractJson(text)
  if (!candidate) return { ok: false, raw: text.trim() }
  let value: unknown
  try {
    value = JSON.parse(candidate)
  } catch {
    return { ok: false, raw: text.trim() }
  }
  if (!value || typeof value !== 'object') return { ok: false, raw: text.trim() }
  const record = value as Record<string, unknown>
  const points = Array.isArray(record.points)
    ? record.points
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 8)
    : []
  let oneLiner = typeof record.oneLiner === 'string' ? record.oneLiner.trim() : ''
  if (!oneLiner && points[0]) oneLiner = points[0]
  if (!oneLiner) return { ok: false, raw: text.trim() }
  const chapters = (Array.isArray(record.chapters) ? record.chapters : [])
    .map(parseChapter)
    .filter((chapter): chapter is Chapter => chapter !== null)
    .slice(0, 12)
    .sort((left, right) => left.start - right.start)
  return { ok: true, summary: { oneLiner, points, chapters } }
}

export function alignChapters(summary: Summary, cues: Cue[]): Summary {
  if (cues.length === 0 || summary.chapters.length === 0) return summary
  return {
    ...summary,
    chapters: summary.chapters.map((chapter) => {
      let nearest = cues[0]?.from ?? chapter.start
      let distance = Math.abs(nearest - chapter.start)
      for (const cue of cues) {
        const gap = Math.abs(cue.from - chapter.start)
        if (gap < distance) {
          nearest = cue.from
          distance = gap
        }
      }
      if (distance <= 2) return { ...chapter, start: Math.floor(nearest) }
      return chapter
    }),
  }
}
