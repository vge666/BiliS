function seekVideo(time: number): boolean {
  const videos = Array.from(document.querySelectorAll('video'))
  const visible = videos.filter((video) => {
    const rect = video.getBoundingClientRect()
    return rect.width > 40 && rect.height > 40
  })
  visible.sort((left, right) => right.clientWidth * right.clientHeight - left.clientWidth * left.clientHeight)
  const video = visible[0] ?? videos[0]
  if (!video) return false
  video.currentTime = time
  void video.play().catch(() => undefined)
  return true
}

export async function seekInTab(tabId: number, seconds: number): Promise<boolean> {
  try {
    const response: unknown = await chrome.tabs.sendMessage(tabId, { type: 'SEEK', seconds })
    if (response && typeof response === 'object' && 'ok' in response && response.ok === true) return true
  } catch {
    // The content script is not on this tab yet.
  }
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: seekVideo,
      args: [seconds],
    })
    return injected?.result === true
  } catch {
    return false
  }
}
