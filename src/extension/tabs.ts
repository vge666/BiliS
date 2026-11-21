export async function getActiveTab(): Promise<{ id: number; url: string } | null> {
  const queries = [
    { active: true, lastFocusedWindow: true },
    { active: true, currentWindow: true },
  ] as const
  for (const query of queries) {
    const [tab] = await chrome.tabs.query(query)
    if (tab?.id && tab.url) return { id: tab.id, url: tab.url }
  }
  return null
}
