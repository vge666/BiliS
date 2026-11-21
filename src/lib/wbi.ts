import { md5 } from './md5.ts'

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41,
  13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52,
]

export function extractWbiKey(url: string): string {
  const name = url.split('/').pop() ?? ''
  return name.split('?')[0].replace(/\.[^.]+$/, '')
}

export function getMixinKey(raw: string): string {
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index] ?? '').join('').slice(0, 32)
}

export function signWbi(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string,
  timestamp: number,
): string {
  const mixin = getMixinKey(`${imgKey}${subKey}`)
  const signed: Record<string, string> = { wts: String(timestamp) }
  for (const [key, value] of Object.entries(params)) {
    signed[key] = String(value).replace(/[!'()*]/g, '')
  }
  const query = Object.keys(signed)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(signed[key] ?? '')}`)
    .join('&')
  return `${query}&w_rid=${md5(query + mixin)}`
}

export function playerUrl(aid: number, cid: number, imgKey: string, subKey: string, timestamp: number): string {
  return `https://api.bilibili.com/x/player/wbi/v2?${signWbi({ aid, cid }, imgKey, subKey, timestamp)}`
}

export function dmViewUrl(aid: number, cid: number): string {
  const params = new URLSearchParams({
    type: '1',
    oid: String(cid),
    pid: String(aid),
  })
  return `https://api.bilibili.com/x/v2/dm/view?${params.toString()}`
}

export function viewUrl(target: { bvid?: string; aid?: string }): string {
  const params = new URLSearchParams()
  if (target.bvid) params.set('bvid', target.bvid)
  else if (target.aid) params.set('aid', target.aid)
  else throw new Error('缺少视频号')
  return `https://api.bilibili.com/x/web-interface/view?${params.toString()}`
}
