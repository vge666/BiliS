const SYSTEM = [
  '你是视频内容总结助手。只根据用户给出的材料作答，不要补充材料里没有的情节、数字、观点或结论。',
  '用简体中文。只输出一个 JSON 对象，不要使用 Markdown，不要加代码块。',
].join('')

const SHAPE = [
  '输出 JSON，结构如下：',
  '{"oneLiner":"一句话概括，不超过 40 字","points":["3 到 7 条要点，每条一句话"],"chapters":[{"start":0,"title":"章节名","summary":"这一段在讲什么"}]}',
  'chapters 按时间升序，通常 4 到 8 段。start 是秒，必须来自材料里出现过的时间，不要编造。',
].join('\n')

export type PromptInput = {
  title: string
  owner: string
  part: string
  desc: string
}

export function buildFullPrompt(input: PromptInput & { transcript: string }): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: [
      '请总结下面的 B 站视频。',
      `标题：${input.title}`,
      `UP 主：${input.owner || '未知'}`,
      `分P：${input.part}`,
      `简介：${input.desc || '无'}`,
      '',
      '字幕（方括号里是 mm:ss 或 h:mm:ss，章节 start 用对应的秒数）：',
      input.transcript,
      '',
      SHAPE,
    ].join('\n'),
  }
}

export function buildChunkPrompt(
  input: PromptInput & { transcript: string; index: number; total: number },
): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: [
      `这是长视频的第 ${input.index}/${input.total} 段字幕，不是全片。只总结这一段。`,
      '标题只用于理解主题，事实以这段字幕为准。',
      `标题：${input.title}`,
      `分P：${input.part}`,
      '',
      input.transcript,
      '',
      'points 写 3 到 5 条。chapters.start 必须来自本段字幕时间。',
      SHAPE,
    ].join('\n'),
  }
}

export function buildMergePrompt(input: PromptInput & { partials: string[] }): { system: string; user: string } {
  const blocks = input.partials.map((partial, index) => `第 ${index + 1} 段：\n${partial}`).join('\n\n')
  return {
    system: SYSTEM,
    user: [
      '下面是同一支视频各段的总结。请合并成一份全片总结。',
      '只保留分段里出现过的信息。chapters 按 start 升序，start 必须是分段结果里已经出现过的秒数，可以合并相邻重复章节，不要发明新时间。',
      'points 写 5 到 7 条，覆盖全片。oneLiner 不超过 40 个字。',
      `标题：${input.title}`,
      `UP 主：${input.owner || '未知'}`,
      `分P：${input.part}`,
      '',
      blocks,
      '',
      SHAPE,
    ].join('\n'),
  }
}

export function buildDescriptionPrompt(input: PromptInput): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: [
      '这个视频没有可用字幕。只根据标题和简介总结，不要假装看过正片。chapters 必须是空数组。',
      `标题：${input.title}`,
      `UP 主：${input.owner || '未知'}`,
      `分P：${input.part}`,
      `简介：${input.desc}`,
      '',
      SHAPE,
    ].join('\n'),
  }
}
