import { useEffect, useRef, type ReactNode } from 'react'

export function Shell({
  tab,
  onTab,
  busy,
  progressValue,
  children,
  footer,
}: {
  tab: 'summary' | 'settings'
  onTab: (tab: 'summary' | 'settings') => void
  busy: boolean
  progressValue: number | null
  children: ReactNode
  footer?: ReactNode
}) {
  const tabsRef = useRef<(HTMLElement & { activeTabIndex: number }) | null>(null)
  useEffect(() => {
    const node = tabsRef.current
    if (!node) return
    const handler = () => onTab(node.activeTabIndex === 1 ? 'settings' : 'summary')
    node.addEventListener('change', handler)
    return () => node.removeEventListener('change', handler)
  }, [onTab])
  useEffect(() => {
    const node = tabsRef.current
    if (!node) return
    const index = tab === 'settings' ? 1 : 0
    if (node.activeTabIndex !== index) node.activeTabIndex = index
  }, [tab])

  return (
    <div className="app">
      <header className="top-app-bar">
        <h1 className="title-large">B站总结</h1>
        {busy ? <md-linear-progress indeterminate={progressValue === null} value={progressValue ?? 0} /> : null}
      </header>
      <md-tabs ref={tabsRef}>
        <md-primary-tab aria-label="总结">总结</md-primary-tab>
        <md-primary-tab aria-label="设置">设置</md-primary-tab>
      </md-tabs>
      <div className="scroll">{children}</div>
      {footer ? <div className="action-bar">{footer}</div> : null}
    </div>
  )
}
