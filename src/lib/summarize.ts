import { chatComplete } from './llm.ts'
import { buildChunkPrompt, buildDescriptionPrompt, buildFullPrompt, buildMergePrompt } from './prompts.ts'
import { chunkTranscript } from './subtitle.ts'
import { alignChapters, parseSummaryJson } from './summary-json.ts'
import type { Cue, ParsedSummary, SummarySource, VideoMeta } from './types.ts'

export type SummarizeProgress = {
  done: number
  total: number
  label: string
}

export async function summarizeMaterial(options: {
  meta: VideoMeta
  source: SummarySource
  cues?: Cue[]
  settings: { baseUrl: string; model: string; apiKey: string; thinking?: number }
  fetchImpl?: typeof fetch
  chunkLimit?: number
  onProgress?: (progress: SummarizeProgress) => void
}): Promise<ParsedSummary> {
  const base = {
    title: options.meta.title,
    owner: options.meta.owner,
    part: options.meta.page.part,
    desc: options.meta.desc,
  }
  const call = (system: string, user: string) =>
    chatComplete({
      baseUrl: options.settings.baseUrl,
      apiKey: options.settings.apiKey,
      model: options.settings.model,
      thinking: options.settings.thinking ?? 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      fetchImpl: options.fetchImpl,
    })

  if (options.source === 'description') {
    options.onProgress?.({ done: 1, total: 1, label: '正在根据简介总结…' })
    const prompt = buildDescriptionPrompt(base)
    const raw = await call(prompt.system, prompt.user)
    const parsed = parseSummaryJson(raw)
    if (!parsed.ok) return parsed
    return { ok: true, summary: { ...parsed.summary, chapters: [] } }
  }

  const cues = options.cues ?? []
  if (cues.length === 0) throw new Error('没有可以总结的字幕')
  const chunks = chunkTranscript(cues, options.chunkLimit ?? 12_000)
  if (chunks.length === 0) throw new Error('没有可以总结的字幕')

  if (chunks.length === 1) {
    options.onProgress?.({ done: 1, total: 1, label: '正在总结…' })
    const prompt = buildFullPrompt({ ...base, transcript: chunks[0] ?? '' })
    const raw = await call(prompt.system, prompt.user)
    const parsed = parseSummaryJson(raw)
    if (!parsed.ok) return parsed
    return { ok: true, summary: alignChapters(parsed.summary, cues) }
  }

  const total = chunks.length + 1
  const partials: string[] = []
  for (let index = 0; index < chunks.length; index += 1) {
    options.onProgress?.({
      done: index + 1,
      total,
      label: `正在总结第 ${index + 1}/${total} 步…`,
    })
    const prompt = buildChunkPrompt({
      ...base,
      transcript: chunks[index] ?? '',
      index: index + 1,
      total: chunks.length,
    })
    partials.push(await call(prompt.system, prompt.user))
  }
  options.onProgress?.({ done: total, total, label: `正在总结第 ${total}/${total} 步…` })
  const merge = buildMergePrompt({ ...base, partials })
  const raw = await call(merge.system, merge.user)
  const parsed = parseSummaryJson(raw)
  if (!parsed.ok) return parsed
  return { ok: true, summary: alignChapters(parsed.summary, cues) }
}
