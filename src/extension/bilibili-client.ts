import type { BiliClient } from '../lib/types.ts'

type PageResult = { status: number; body: string; error?: string }

export function cookieHeader(cookies: { name: string; value: string }[]): string {
  return cookies
    .filter((cookie) => cookie.name && cookie.value)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

async function fetchInTab(tabId: number, url: string): Promise<PageResult> {
  const [injected] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [url],
    func: async (requestUrl: string) => {
      try {
        const response = await fetch(requestUrl, {
          credentials: 'include',
          signal: AbortSignal.timeout(20_000),
        })
        return { status: response.status, body: await response.text() }
      } catch (error) {
        return { status: 0, body: '', error: error instanceof Error ? error.message : '请求失败' }
      }
    },
  })
  return injected?.result ?? { status: 0, body: '', error: '页面没有返回结果' }
}

async function fetchFromExtension(url: string): Promise<PageResult> {
  const cookies = await chrome.cookies.getAll({ domain: 'bilibili.com' })
  const cookie = cookieHeader(cookies)
  try {
    const response = await fetch(url, {
      credentials: 'omit',
      headers: {
        Accept: '*/*',
        Referer: 'https://www.bilibili.com/',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(20_000),
    })
    return { status: response.status, body: await response.text() }
  } catch (error) {
    return { status: 0, body: '', error: error instanceof Error ? error.message : '请求失败' }
  }
}

export function createTabClient(tabId: number): BiliClient {
  return {
    async get(url: string) {
      let fromPage: PageResult
      try {
        fromPage = await fetchInTab(tabId, url)
      } catch (error) {
        fromPage = { status: 0, body: '', error: error instanceof Error ? error.message : '请求失败' }
      }
      if (fromPage.status > 0) return { status: fromPage.status, body: fromPage.body }
      const fromExtension = await fetchFromExtension(url)
      if (fromExtension.status > 0) return { status: fromExtension.status, body: fromExtension.body }
      throw new Error(fromPage.error || fromExtension.error || '网络请求失败')
    },
  }
}
