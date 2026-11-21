import { formatTimestamp } from '../lib/subtitle.ts'
import type { StoredSummary, VideoMeta } from '../lib/types.ts'
import { useFieldValue } from './fields.tsx'
import { SymbolIcon } from './icons.tsx'
import type { IdleKind, PanelStatus } from './use-summary.ts'

function formatWhen(createdAt: number): string {
  return new Date(createdAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SummaryView({
  status,
  idleKind,
  video,
  summary,
  error,
  blocker,
  progress,
  seekNote,
  onSelectPage,
  onSeek,
}: {
  status: PanelStatus
  idleKind: IdleKind
  video: VideoMeta | null
  summary: StoredSummary | null
  error: string | null
  blocker: string | null
  progress: string | null
  seekNote: string | null
  onSelectPage: (page: number) => void
  onSeek: (seconds: number) => void
}) {
  if (status === 'unsupported') {
    return (
      <md-filled-card>
        <p className="title-medium">在 Chrome 扩展里打开</p>
        <p className="body-medium on-surface-variant">加载 dist 后，从浏览器侧边栏打开这个面板。</p>
      </md-filled-card>
    )
  }

  if (status === 'idle') {
    const message =
      idleKind === 'bilibili'
        ? '这个页面不是普通视频。打开一个 bilibili.com/video/BV… 页面后再总结。'
        : '支持普通视频页，地址类似 bilibili.com/video/BV…。直播和番剧播放页不在范围内。'
    return (
      <md-filled-card>
        <div className="row">
          <SymbolIcon name="subtitles" />
          <p className="title-medium">打开一个 B 站视频</p>
        </div>
        <p className="body-medium on-surface-variant">{message}</p>
      </md-filled-card>
    )
  }

  if (status === 'loading' || (status === 'error' && !video)) {
    return (
      <>
        {status === 'error' && error ? (
          <div className="banner banner--error" role="alert">
            <SymbolIcon name="error" />
            <p className="body-medium">{error}</p>
          </div>
        ) : (
          <p className="body-large">正在读取视频信息…</p>
        )}
      </>
    )
  }

  if (!video) return null
  const structured = summary?.parsed.ok ? summary.parsed.summary : null

  return (
    <>
      <md-filled-card>
        <p className="title-medium">{video.title}</p>
        <p className="body-medium on-surface-variant">
          {[video.owner || '未知 UP', formatTimestamp(video.page.duration)].join(' · ')}
        </p>
        {video.pages.length > 1 ? (
          <PartSelect pages={video.pages} page={video.page.page} onSelectPage={onSelectPage} />
        ) : null}
      </md-filled-card>

      {error ? (
        <div className="banner banner--error" role="alert">
          <SymbolIcon name="error" />
          <p className="body-medium">{error}</p>
        </div>
      ) : null}

      {blocker ? (
        <div className="banner banner--info">
          <SymbolIcon name="info" />
          <p className="body-medium">{blocker}</p>
        </div>
      ) : null}

      {status === 'working' && progress ? <p className="body-large">{progress}</p> : null}

      {summary?.source === 'description' ? (
        <div className="banner banner--note">
          <SymbolIcon name="info" />
          <p className="body-medium">这份总结只来自标题和简介，不是根据字幕。</p>
        </div>
      ) : null}

      {summary ? (
        <md-filled-card>
          <div className="row">
            <p className="body-small on-surface-variant">上次总结于 {formatWhen(summary.createdAt)}</p>
            {summary.trackLabel ? <p className="label-large primary">{summary.trackLabel}</p> : null}
          </div>
          {structured ? (
            <>
              <p className="title-large">{structured.oneLiner}</p>
              {structured.points.length > 0 ? (
                <>
                  <p className="title-small">要点</p>
                  <ul className="points">
                    {structured.points.map((point, index) => (
                      <li key={`${index}-${point}`} className="body-large">
                        {point}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {structured.chapters.length > 0 ? (
                <>
                  <p className="title-small">时间线</p>
                  <ol className="chapters">
                    {structured.chapters.map((chapter) => (
                      <li key={`${chapter.start}-${chapter.title}`} className="chapter">
                        <md-text-button
                          onClick={() => onSeek(chapter.start)}
                          aria-label={`跳到 ${formatTimestamp(chapter.start)}`}
                        >
                          {formatTimestamp(chapter.start)}
                        </md-text-button>
                        <p className="title-small">{chapter.title}</p>
                        {chapter.summary ? <p className="body-medium on-surface-variant">{chapter.summary}</p> : null}
                      </li>
                    ))}
                  </ol>
                  {seekNote ? <p className="body-small on-surface-variant">{seekNote}</p> : null}
                </>
              ) : null}
            </>
          ) : (
            <>
              <p className="title-small">模型没有按约定返回结构，下面是原文。</p>
              <pre className="body-medium raw">{summary.parsed.ok ? '' : summary.parsed.raw}</pre>
            </>
          )}
        </md-filled-card>
      ) : null}
    </>
  )
}

function PartSelect({
  pages,
  page,
  onSelectPage,
}: {
  pages: VideoMeta['pages']
  page: number
  onSelectPage: (page: number) => void
}) {
  const ref = useFieldValue(String(page), (value) => onSelectPage(Number(value)))
  return (
    <md-filled-select ref={ref} label="分P" menuPositioning="popover" value={String(page)}>
      {pages.map((item) => (
        <md-select-option key={item.page} value={String(item.page)} selected={item.page === page}>
          <div slot="headline">{`P${item.page} ${item.part}`}</div>
        </md-select-option>
      ))}
    </md-filled-select>
  )
}
