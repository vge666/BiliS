import type { VideoTarget } from './types.ts'

export type PageKind =
  | { kind: 'video'; target: VideoTarget }
  | { kind: 'bilibili' }
  | { kind: 'other' }
  | { kind: 'invalid' }

function readPage(url: URL): number {
  const page = Number(url.searchParams.get('p') || '1')
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function classifyLocation(input: string): PageKind {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return { kind: 'invalid' }
  }
  if (!/(^|\.)bilibili\.com$/i.test(url.hostname)) return { kind: 'other' }
  const bvidMatch = url.pathname.match(/\/video\/(BV[0-9A-Za-z]{10})/i)
  if (bvidMatch?.[1]) {
    return {
      kind: 'video',
      target: { bvid: `BV${bvidMatch[1].slice(2)}`, page: readPage(url) },
    }
  }
  const aidMatch = url.pathname.match(/\/video\/av(\d+)/i)
  if (aidMatch?.[1]) {
    return { kind: 'video', target: { aid: aidMatch[1], page: readPage(url) } }
  }
  return { kind: 'bilibili' }
}
