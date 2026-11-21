export type VideoTarget = {
  bvid?: string
  aid?: string
  page: number
}

export type VideoPage = {
  cid: number
  page: number
  part: string
  duration: number
}

export type VideoMeta = {
  bvid: string
  aid: number
  title: string
  desc: string
  owner: string
  page: VideoPage
  pages: VideoPage[]
}

export type Cue = {
  from: number
  content: string
}

export type SubtitleTrack = {
  id: string
  lan: string
  lanDoc: string
  url: string
  aiType: number
}

export type ExtractOk = {
  status: 'ok'
  meta: VideoMeta
  isLogin: boolean | null
  track: SubtitleTrack
  cues: Cue[]
}

export type ExtractNoSubtitle = {
  status: 'no-subtitle'
  meta: VideoMeta
  isLogin: boolean | null
}

export type ExtractError = {
  status: 'error'
  message: string
  meta?: VideoMeta
}

export type ExtractResult = ExtractOk | ExtractNoSubtitle | ExtractError

export type Chapter = {
  start: number
  title: string
  summary: string
}

export type Summary = {
  oneLiner: string
  points: string[]
  chapters: Chapter[]
}

export type ParsedSummary =
  | { ok: true; summary: Summary }
  | { ok: false; raw: string }

export type SummarySource = 'subtitle' | 'description'

export type StoredSummary = {
  source: SummarySource
  trackLabel?: string
  createdAt: number
  parsed: ParsedSummary
}

export type PresetId = 'deepseek' | 'kimi' | 'openai' | 'custom'

export type Settings = {
  preset: PresetId
  baseUrl: string
  model: string
  apiKey: string
}

export interface BiliClient {
  get(url: string): Promise<{ status: number; body: string }>
}
