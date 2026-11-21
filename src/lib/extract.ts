import type { BiliClient, ExtractResult, VideoMeta, VideoPage, VideoTarget } from './types.ts'
import { parseCues, pickTrack, tracksFromBlob, tracksFromPlayer, absoluteUrl } from './subtitle.ts'
import { dmViewUrl, extractWbiKey, playerUrl, viewUrl } from './wbi.ts'

type ViewData = {
  bvid?: string
  aid?: number
  cid?: number
  title?: string
  desc?: string
  desc_v2?: { raw_text?: string }[]
  duration?: number
  owner?: { name?: string }
  pages?: { cid?: number; page?: number; part?: string; duration?: number }[]
}

async function readText(client: BiliClient, url: string): Promise<string> {
  const { status, body } = await client.get(url)
  if (status === 412) throw new Error('B 站拒绝了这次请求（412）。刷新视频页后再试。')
  if (status >= 400 || status === 0) throw new Error(status ? `B 站接口返回 ${status}` : '网络请求失败')
  return body
}

function readDesc(data: ViewData): string {
  if (data.desc?.trim()) return data.desc.trim()
  if (!Array.isArray(data.desc_v2)) return ''
  return data.desc_v2
    .map((part) => part.raw_text ?? '')
    .join('\n')
    .trim()
}

function readPages(data: ViewData): VideoPage[] {
  const pages = (data.pages ?? [])
    .map((page) => ({
      cid: Number(page.cid),
      page: Number(page.page),
      part: (page.part ?? '').trim() || `第${page.page}P`,
      duration: Number(page.duration) || 0,
    }))
    .filter((page) => Number.isFinite(page.cid) && page.cid > 0 && Number.isFinite(page.page))
  if (pages.length > 0) return pages
  const cid = Number(data.cid)
  if (!Number.isFinite(cid) || cid <= 0) return []
  return [{ cid, page: 1, part: '正片', duration: Number(data.duration) || 0 }]
}

export function pickPage(pages: VideoPage[], page: number): VideoPage {
  return pages.find((item) => item.page === page) ?? pages[0]!
}

export async function fetchVideoMeta(client: BiliClient, target: VideoTarget): Promise<VideoMeta> {
  const body = await readText(client, viewUrl(target))
  const response = JSON.parse(body) as { code?: number; message?: string; data?: ViewData }
  const data = response.data
  if (response.code !== 0 || !data?.aid) throw new Error(response.message || '没有找到这个视频')
  const pages = readPages(data)
  if (pages.length === 0) throw new Error('没有找到这个视频的分P')
  return {
    bvid: data.bvid || target.bvid || '',
    aid: Number(data.aid),
    title: data.title?.trim() || '未命名视频',
    desc: readDesc(data),
    owner: data.owner?.name?.trim() || '',
    page: pickPage(pages, target.page),
    pages,
  }
}

function readLogin(data: { isLogin?: boolean } | undefined): boolean | null {
  if (!data || typeof data.isLogin !== 'boolean') return null
  return data.isLogin
}

function errorMessage(primary: string, fallback: string): string {
  const detail = `${primary} ${fallback}`
  if (detail.includes('412')) return 'B 站拒绝了这次请求（412）。刷新视频页后再试。'
  return '读取字幕失败。刷新视频页后再试。'
}

export async function extractVideo(
  client: BiliClient,
  target: VideoTarget,
  now: () => number = () => Math.floor(Date.now() / 1000),
): Promise<ExtractResult> {
  let meta: VideoMeta
  try {
    meta = await fetchVideoMeta(client, target)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : '没有找到这个视频' }
  }

  let isLogin: boolean | null = null
  let tracks: ReturnType<typeof tracksFromPlayer> = []
  let primaryError: string | null = null

  try {
    const nav = JSON.parse(await readText(client, 'https://api.bilibili.com/x/web-interface/nav')) as {
      data?: { isLogin?: boolean; wbi_img?: { img_url?: string; sub_url?: string } }
    }
    isLogin = readLogin(nav.data)
    const img = nav.data?.wbi_img?.img_url
    const sub = nav.data?.wbi_img?.sub_url
    if (!img || !sub) throw new Error('没有拿到 B 站签名参数')
    // 未签名的 /x/player/v2 曾经返回过别的视频的字幕，不用它。
    const player = JSON.parse(
      await readText(client, playerUrl(meta.aid, meta.page.cid, extractWbiKey(img), extractWbiKey(sub), now())),
    ) as {
      code?: number
      message?: string
      data?: { subtitle?: { subtitles?: unknown; list?: unknown } }
    }
    if (player.code !== 0) throw new Error(player.message || '播放器接口没有返回字幕')
    tracks = tracksFromPlayer(player.data?.subtitle?.subtitles ?? player.data?.subtitle?.list ?? [], String(meta.aid), String(meta.page.cid))
  } catch (error) {
    primaryError = error instanceof Error ? error.message : '读取字幕失败'
  }

  let fallbackError: string | null = null
  if (tracks.length === 0) {
    try {
      tracks = tracksFromBlob(await readText(client, dmViewUrl(meta.aid, meta.page.cid)), String(meta.aid), String(meta.page.cid))
    } catch (error) {
      fallbackError = error instanceof Error ? error.message : '读取字幕失败'
    }
  }

  if (tracks.length === 0) {
    if (primaryError && fallbackError) return { status: 'error', message: errorMessage(primaryError, fallbackError), meta }
    return { status: 'no-subtitle', meta, isLogin }
  }

  const track = pickTrack(tracks)
  if (!track) return { status: 'no-subtitle', meta, isLogin }
  try {
    const raw = await readText(client, absoluteUrl(track.url))
    const cues = parseCues(JSON.parse(raw.replace(/^\uFEFF/, '')))
    if (cues.length === 0) return { status: 'no-subtitle', meta, isLogin }
    return { status: 'ok', meta, isLogin, track, cues }
  } catch (error) {
    const message = error instanceof Error && error.message.includes('412') ? error.message : '字幕下载失败，请再试一次。'
    return { status: 'error', message, meta }
  }
}
