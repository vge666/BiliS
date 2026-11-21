import { useCallback, useEffect, useRef, useState } from 'react'
import { createTabClient } from '../extension/bilibili-client.ts'
import { summaryFolderName, writeSummaryFile } from '../extension/summary-folder.ts'
import { loadSettings, readBestCache, saveCache, saveSettings } from '../extension/storage.ts'
import { seekInTab } from '../extension/seek.ts'
import { getActiveTab } from '../extension/tabs.ts'
import { cacheKeysFor } from '../lib/cache.ts'
import { extractVideo, fetchVideoMeta } from '../lib/extract.ts'
import { subtitleGapCopy } from '../lib/gap.ts'
import { descriptionIsUsable } from '../lib/subtitle.ts'
import { summarizeMaterial } from '../lib/summarize.ts'
import { summaryToText } from '../lib/summary-text.ts'
import type { Cue, Settings, StoredSummary, SummarySource, VideoMeta } from '../lib/types.ts'
import { classifyLocation } from '../lib/video-url.ts'

export type PanelStatus = 'idle' | 'loading' | 'ready' | 'working' | 'error' | 'unsupported'
export type IdleKind = 'other' | 'bilibili' | 'invalid'

function extensionReady(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.tabs) && Boolean(chrome.storage)
}

export function useSummaryPanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [status, setStatus] = useState<PanelStatus>('loading')
  const [idleKind, setIdleKind] = useState<IdleKind>('other')
  const [tabId, setTabId] = useState<number | null>(null)
  const [video, setVideo] = useState<VideoMeta | null>(null)
  const [summary, setSummary] = useState<StoredSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blocker, setBlocker] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [progressValue, setProgressValue] = useState<number | null>(null)
  const [seekNote, setSeekNote] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedFile, setSavedFile] = useState<string | null>(null)
  const [showInPlugin, setShowInPlugin] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const settingsRef = useRef(settings)
  const videoRef = useRef(video)
  const summaryRef = useRef(summary)
  const summaryGen = useRef(0)
  settingsRef.current = settings
  videoRef.current = video
  summaryRef.current = summary

  useEffect(() => {
    if (!extensionReady()) return
    void loadSettings().then((loaded) => {
      settingsRef.current = loaded
      setSettings(loaded)
    })
  }, [])

  useEffect(() => {
    if (!extensionReady()) {
      setStatus('unsupported')
      return
    }
    let gen = 0
    let lastKey = ''
    const refresh = () => {
      const my = ++gen
      void (async () => {
        const tab = await getActiveTab()
        if (my !== gen) return
        if (!tab) {
          lastKey = 'none'
          setTabId(null)
          setVideo(null)
          setSummary(null)
          setBlocker(null)
          setError(null)
          setStatus('idle')
          setIdleKind('other')
          return
        }
        const classified = classifyLocation(tab.url)
        if (classified.kind !== 'video') {
          lastKey = `idle:${tab.url}`
          setTabId(tab.id)
          setVideo(null)
          setSummary(null)
          setBlocker(null)
          setError(null)
          setStatus('idle')
          setIdleKind(classified.kind === 'invalid' ? 'invalid' : classified.kind === 'bilibili' ? 'bilibili' : 'other')
          return
        }
        const key = `${tab.id}:${classified.target.bvid ?? ''}:${classified.target.aid ?? ''}:${classified.target.page}`
        if (key === lastKey) return
        lastKey = key
        summaryGen.current += 1
        setTabId(tab.id)
        setStatus('loading')
        setError(null)
        setBlocker(null)
        setVideo(null)
        setSummary(null)
        setProgress(null)
        try {
          const meta = await fetchVideoMeta(createTabClient(tab.id), classified.target)
          if (my !== gen) return
          setVideo(meta)
          const current = settingsRef.current
          if (current) setSummary(await readBestCache(meta, current))
          if (my !== gen) return
          setStatus('ready')
        } catch (caught) {
          if (my !== gen) return
          setStatus('error')
          setError(caught instanceof Error ? caught.message : '读取视频信息失败')
        }
      })()
    }
    refresh()
    const onActivated = () => refresh()
    const onUpdated: Parameters<typeof chrome.tabs.onUpdated.addListener>[0] = (_tabId, info) => {
      if (info.url || info.status === 'complete') refresh()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      gen += 1
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [reloadToken])

  useEffect(() => {
    const current = videoRef.current
    if (!settings || !current) return
    const gen = summaryGen.current
    let cancelled = false
    void readBestCache(current, settings).then((cached) => {
      if (!cancelled && summaryGen.current === gen) setSummary(cached)
    })
    return () => {
      cancelled = true
    }
  }, [settings])

  const selectPage = useCallback((page: number) => {
    const current = videoRef.current
    const currentSettings = settingsRef.current
    if (!current) return
    const next = current.pages.find((item) => item.page === page)
    if (!next) return
    const meta = { ...current, page: next }
    summaryGen.current += 1
    const gen = summaryGen.current
    setVideo(meta)
    setBlocker(null)
    setError(null)
    setStatus('ready')
    if (!currentSettings) {
      setSummary(null)
      return
    }
    void readBestCache(meta, currentSettings).then((cached) => {
      if (summaryGen.current === gen) setSummary(cached)
    })
  }, [])

  const deliver = useCallback(async (meta: VideoMeta, stored: StoredSummary, current: Settings, gen: number) => {
    if (summaryGen.current !== gen) return
    setSummary(stored)
    setBlocker(null)
    setShowInPlugin(current.output !== 'folder')
    setSavedFile(null)
    if (current.output !== 'plugin') {
      try {
        const filename = await writeSummaryFile(meta, stored)
        if (summaryGen.current !== gen) return
        setSavedFile(filename)
      } catch (caught) {
        if (summaryGen.current !== gen) return
        setShowInPlugin(true)
        setError(caught instanceof Error ? caught.message : '写入文件夹失败')
      }
    }
    if (summaryGen.current !== gen) return
    setStatus('ready')
    setProgress(null)
    setProgressValue(null)
  }, [])

  const runSummary = useCallback(
    async (mode: SummarySource, force: boolean) => {
      const currentVideo = videoRef.current
      const currentSettings = settingsRef.current
      if (!currentVideo || !currentSettings || tabId === null) return
      if (!currentSettings.apiKey.trim()) {
        setError('先在设置里填写 API Key。')
        return
      }
      if (currentSettings.output !== 'plugin' && !(await summaryFolderName())) {
        setError('先在设置里选择保存文件夹。')
        setStatus('ready')
        return
      }
      const gen = ++summaryGen.current
      setStatus('working')
      setError(null)
      setSeekNote(null)
      setProgress(mode === 'description' ? '正在根据简介总结…' : '正在读取字幕…')
      setProgressValue(null)
      try {
        let activeMeta = currentVideo
        let trackLabel: string | undefined
        let cues: Cue[] | undefined
        if (mode === 'subtitle') {
          const extracted = await extractVideo(createTabClient(tabId), {
            bvid: currentVideo.bvid || undefined,
            aid: currentVideo.bvid ? undefined : String(currentVideo.aid),
            page: currentVideo.page.page,
          })
          if (summaryGen.current !== gen) return
          if (extracted.status === 'error') throw new Error(extracted.message)
          if (extracted.status === 'no-subtitle') {
            setVideo(extracted.meta)
            setBlocker(subtitleGapCopy(extracted.isLogin))
            setStatus('ready')
            setProgress(null)
            if (summaryRef.current?.source === 'subtitle') setSummary(null)
            return
          }
          activeMeta = extracted.meta
          cues = extracted.cues
          trackLabel = extracted.track.lanDoc || extracted.track.lan
          setVideo(extracted.meta)
          setBlocker(null)
          if (!force) {
            const cached = await readBestCache(extracted.meta, currentSettings)
            if (summaryGen.current !== gen) return
            if (cached?.source === 'subtitle') {
              await deliver(extracted.meta, cached, currentSettings, gen)
              return
            }
          }
        } else if (!descriptionIsUsable(currentVideo.desc)) {
          throw new Error('简介太短，没法只靠简介总结。')
        }

        const parsed = await summarizeMaterial({
          meta: activeMeta,
          source: mode,
          cues,
          settings: currentSettings,
          onProgress: (item) => {
            if (summaryGen.current !== gen) return
            setProgress(item.label)
            setProgressValue(item.total > 0 ? item.done / item.total : null)
          },
        })
        if (summaryGen.current !== gen) return
        const stored: StoredSummary = {
          source: mode,
          trackLabel,
          createdAt: Date.now(),
          parsed: parsed.ok ? parsed : { ok: false, raw: parsed.raw.slice(0, 20_000) },
        }
        const keys = cacheKeysFor(activeMeta, currentSettings)
        await saveCache(mode === 'subtitle' ? keys.subtitle : keys.description, stored)
        await deliver(activeMeta, stored, currentSettings, gen)
      } catch (caught) {
        if (summaryGen.current !== gen) return
        setStatus(videoRef.current ? 'ready' : 'error')
        setProgress(null)
        setProgressValue(null)
        setError(caught instanceof Error ? caught.message : '总结失败')
      }
    },
    [deliver, tabId],
  )

  const seek = useCallback(
    async (seconds: number) => {
      if (tabId === null) return
      setSeekNote(null)
      const ok = await seekInTab(tabId, seconds)
      setSeekNote(ok ? null : '没能跳转。回到视频页后，可以直接拖动进度条。')
    },
    [tabId],
  )

  const copySummary = useCallback(async () => {
    const current = summaryRef.current
    const currentVideo = videoRef.current
    if (!current || !currentVideo) return
    try {
      await navigator.clipboard.writeText(summaryToText(currentVideo, current))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('复制失败。')
    }
  }, [])

  const persistSettings = useCallback(async (next: Settings) => {
    const saved = await saveSettings(next)
    settingsRef.current = saved
    summaryGen.current += 1
    setSettings(saved)
    return saved
  }, [])

  return {
    settings,
    status,
    idleKind,
    video,
    summary,
    error,
    blocker,
    progress,
    progressValue,
    seekNote,
    copied,
    savedFile,
    showInPlugin,
    revealInPlugin: () => setShowInPlugin(true),
    hasKey: Boolean(settings?.apiKey.trim()),
    canDescribe: Boolean(video && descriptionIsUsable(video.desc)),
    selectPage,
    summarize: () => void runSummary('subtitle', false),
    regenerate: () => void runSummary('subtitle', true),
    summarizeDescription: () => void runSummary('description', true),
    seek,
    copySummary,
    persistSettings,
    retry: () => setReloadToken((value) => value + 1),
  }
}
