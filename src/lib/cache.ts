import type { Settings, StoredSummary, SummarySource, VideoMeta } from './types.ts'

export function summaryCacheKey(input: {
  bvid: string
  cid: number
  model: string
  baseUrl: string
  source: SummarySource
}): string {
  return ['summary', input.bvid, String(input.cid), input.model, input.baseUrl, input.source]
    .map((part) => encodeURIComponent(part))
    .join(':')
}

export function isStoredSummary(value: unknown): value is StoredSummary {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredSummary>
  if (record.source !== 'subtitle' && record.source !== 'description') return false
  if (typeof record.createdAt !== 'number') return false
  if (!record.parsed || typeof record.parsed !== 'object') return false
  if (record.parsed.ok === true) return typeof record.parsed.summary?.oneLiner === 'string'
  if (record.parsed.ok === false) return typeof record.parsed.raw === 'string'
  return false
}

export function cacheKeysFor(meta: VideoMeta, settings: Settings): { subtitle: string; description: string } {
  const shared = { bvid: meta.bvid, cid: meta.page.cid, model: settings.model, baseUrl: settings.baseUrl }
  return {
    subtitle: summaryCacheKey({ ...shared, source: 'subtitle' }),
    description: summaryCacheKey({ ...shared, source: 'description' }),
  }
}
