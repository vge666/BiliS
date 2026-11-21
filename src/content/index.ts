function activeVideo(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll('video'))
  const visible = videos.filter((video) => {
    const rect = video.getBoundingClientRect()
    return rect.width > 40 && rect.height > 40
  })
  visible.sort((left, right) => right.clientWidth * right.clientHeight - left.clientWidth * left.clientHeight)
  return visible[0] ?? videos[0] ?? null
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return
  const record = message as { type?: unknown; seconds?: unknown }
  if (record.type !== 'SEEK' || typeof record.seconds !== 'number' || !Number.isFinite(record.seconds)) return
  const video = activeVideo()
  if (!video) {
    sendResponse({ ok: false })
    return
  }
  video.currentTime = record.seconds
  void video.play().catch(() => undefined)
  sendResponse({ ok: true })
})
