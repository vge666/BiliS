import { cacheKeysFor, isStoredSummary } from '../lib/cache.ts'
import { isBuiltinOrigin, normalizeSettings, originPattern } from '../lib/endpoints.ts'
import type { Settings, StoredSummary, VideoMeta } from '../lib/types.ts'

const SETTINGS_KEY = 'settings'

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return normalizeSettings(stored[SETTINGS_KEY])
}

export async function saveSettings(next: Settings): Promise<Settings> {
  const cleaned: Settings = {
    ...next,
    baseUrl: next.baseUrl.trim().replace(/\/+$/, ''),
    model: next.model.trim(),
    apiKey: next.apiKey.trim(),
  }
  if (!cleaned.model) throw new Error('请填写模型名')
  const pattern = originPattern(cleaned.baseUrl)
  if (!isBuiltinOrigin(pattern)) {
    const granted = await chrome.permissions.request({ origins: [pattern] })
    if (!granted) throw new Error('没有获得该接口的访问权限，设置未保存。')
  }
  await chrome.storage.local.set({ [SETTINGS_KEY]: cleaned })
  return cleaned
}

export async function loadCache(key: string): Promise<StoredSummary | null> {
  const stored = await chrome.storage.local.get(key)
  return isStoredSummary(stored[key]) ? stored[key] : null
}

export async function saveCache(key: string, value: StoredSummary): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function readBestCache(meta: VideoMeta, settings: Settings): Promise<StoredSummary | null> {
  const keys = cacheKeysFor(meta, settings)
  return (await loadCache(keys.subtitle)) ?? (await loadCache(keys.description))
}
