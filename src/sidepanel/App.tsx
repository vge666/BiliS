import { useCallback, useState } from 'react'
import type { Settings, StoredSummary, VideoMeta } from '../lib/types.ts'
import { SettingsView } from './SettingsView.tsx'
import { Shell } from './Shell.tsx'
import { SummaryView } from './SummaryView.tsx'
import { SymbolIcon } from './icons.tsx'
import { useSummaryPanel } from './use-summary.ts'

export function App() {
  const fixture = new URLSearchParams(window.location.search).get('fixture')
  if (fixture) return <Fixture name={fixture} />
  return <LivePanel />
}

function LivePanel() {
  const panel = useSummaryPanel()
  const [tab, setTab] = useState<'summary' | 'settings'>('summary')
  const onTab = useCallback((next: 'summary' | 'settings') => setTab(next), [])
  const showFooter = tab === 'summary' && panel.video !== null && panel.status !== 'loading'
  const primaryLabel = panel.summary?.source === 'subtitle' && !panel.blocker ? '重新总结' : '提取并总结'

  return (
    <Shell
      tab={tab}
      onTab={onTab}
      busy={panel.status === 'loading' || panel.status === 'working'}
      progressValue={panel.status === 'working' ? panel.progressValue : null}
      footer={
        showFooter ? (
          <>
            {!panel.hasKey ? (
              <md-text-button onClick={() => setTab('settings')}>先填写 API Key</md-text-button>
            ) : null}
            {panel.blocker ? (
              <>
                <md-outlined-button disabled={panel.status === 'working'} onClick={panel.summarize}>
                  重新检测字幕
                </md-outlined-button>
                {panel.canDescribe ? (
                  <md-filled-button disabled={!panel.hasKey || panel.status === 'working'} onClick={panel.summarizeDescription}>
                    仅用简介总结
                  </md-filled-button>
                ) : null}
              </>
            ) : (
              <div className="row">
                {panel.summary ? (
                  <md-icon-button aria-label="复制总结" onClick={() => void panel.copySummary()}>
                    <SymbolIcon name="copy" />
                  </md-icon-button>
                ) : null}
                <md-filled-button
                  disabled={!panel.hasKey || panel.status === 'working'}
                  onClick={primaryLabel === '重新总结' ? panel.regenerate : panel.summarize}
                >
                  {panel.status === 'working' ? '正在总结…' : primaryLabel}
                </md-filled-button>
              </div>
            )}
          </>
        ) : panel.status === 'error' && !panel.video ? (
          <md-outlined-button onClick={panel.retry}>重试</md-outlined-button>
        ) : null
      }
    >
      {tab === 'settings' ? (
        <SettingsView settings={panel.settings} onSave={panel.persistSettings} />
      ) : (
        <SummaryView
          status={panel.status}
          idleKind={panel.idleKind}
          video={panel.video}
          summary={panel.summary}
          error={panel.error}
          blocker={panel.blocker}
          progress={panel.progress}
          seekNote={panel.seekNote}
          onSelectPage={panel.selectPage}
          onSeek={(seconds) => void panel.seek(seconds)}
        />
      )}
      {panel.copied ? <div className="snackbar">已复制</div> : null}
    </Shell>
  )
}

const sampleVideo: VideoMeta = {
  bvid: 'BV1aaaaaaaaa',
  aid: 1,
  title: '怎么把一支 B 站视频整理成可跳转的笔记',
  desc: '这支视频讲的是如何用字幕整理全片脉络，而不是只看简介。',
  owner: '拾要',
  page: { cid: 2, page: 1, part: '正片', duration: 754 },
  pages: [
    { cid: 2, page: 1, part: '正片', duration: 754 },
    { cid: 3, page: 2, part: '问答', duration: 320 },
  ],
}

const sampleSummary: StoredSummary = {
  source: 'subtitle',
  trackLabel: '中文（自动生成）',
  createdAt: Date.now() - 60_000,
  parsed: {
    ok: true,
    summary: {
      oneLiner: '用字幕整理全片脉络，并给出能跳回去的时间线。',
      points: ['先确认这支视频有 CC 或 AI 字幕。', '长视频按段提炼，再合并成一份总结。', '时间点来自字幕，点一下就能回到原片。'],
      chapters: [
        { start: 0, title: '为什么不用简介', summary: '简介往往只有宣传，覆盖不了后半段。' },
        { start: 128, title: '字幕从哪来', summary: '优先人工中文字幕，没有再用 AI 字幕。' },
        { start: 406, title: '怎么读这份笔记', summary: '先看一句话和要点，再按时间线回看。' },
      ],
    },
  },
}

function Fixture({ name }: { name: string }) {
  const [tab, setTab] = useState<'summary' | 'settings'>(name === 'settings' ? 'settings' : 'summary')
  const onTab = useCallback((next: 'summary' | 'settings') => setTab(next), [])
  const video = name === 'idle' || name === 'error' ? null : sampleVideo
  const summary = name === 'summary' ? sampleSummary : name === 'description' ? { ...sampleSummary, source: 'description' as const, trackLabel: undefined, parsed: { ok: true as const, summary: { oneLiner: '简介只提到了笔记方法，没有展开例子。', points: ['标题说的是整理视频笔记。'], chapters: [] } } } : null
  return (
    <Shell
      tab={tab}
      onTab={onTab}
      busy={name === 'working'}
      progressValue={name === 'working' ? 0.4 : null}
      footer={
        name === 'error' ? (
          <md-outlined-button>重试</md-outlined-button>
        ) : name === 'nosub' ? (
          <>
            <md-outlined-button>重新检测字幕</md-outlined-button>
            <md-filled-button>仅用简介总结</md-filled-button>
          </>
        ) : video && tab === 'summary' ? (
          <md-filled-button>提取并总结</md-filled-button>
        ) : null
      }
    >
      {tab === 'settings' ? (
        <SettingsView
          settings={{ preset: 'deepseek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: '' }}
          onSave={async (next: Settings) => next}
        />
      ) : (
        <SummaryView
          status={name === 'error' ? 'error' : name === 'working' ? 'working' : name === 'idle' ? 'idle' : 'ready'}
          idleKind="other"
          video={video}
          summary={summary}
          error={name === 'error' ? 'B 站拒绝了这次请求（412）。刷新视频页后再试。' : null}
          blocker={name === 'nosub' ? '这个视频没有 CC 或 AI 字幕。' : null}
          progress={name === 'working' ? '正在总结第 2/5 步…' : null}
          seekNote={null}
          onSelectPage={() => undefined}
          onSeek={() => undefined}
        />
      )}
    </Shell>
  )
}
