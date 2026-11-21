import { useEffect, useRef, useState } from 'react'
import { pickSummaryFolder, summaryFolderName } from '../extension/summary-folder.ts'
import { PRESETS, applyPreset, isPreset, modelsFor } from '../lib/endpoints.ts'
import { THINKING_LABELS, type PresetId, type Settings, type SummaryOutput } from '../lib/types.ts'
import { useFieldValue } from './fields.tsx'
import { SymbolIcon } from './icons.tsx'

const PRESET_OPTIONS: { value: PresetId; label: string }[] = [
  ...(Object.entries(PRESETS) as [PresetId, (typeof PRESETS)[keyof typeof PRESETS]][]).map(([value, preset]) => ({
    value,
    label: preset.label,
  })),
  { value: 'custom', label: '自定义' },
]

const OUTPUT_OPTIONS: { value: SummaryOutput; label: string }[] = [
  { value: 'plugin', label: '在插件里看' },
  { value: 'folder', label: '保存到文件夹' },
  { value: 'both', label: '两边都要' },
]

export function SettingsView({
  settings,
  onSave,
}: {
  settings: Settings | null
  onSave: (next: Settings) => Promise<Settings>
}) {
  const [draft, setDraft] = useState<Settings | null>(settings)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)

  useEffect(() => {
    void summaryFolderName().then(setFolderName).catch(() => setFolderName(null))
  }, [])

  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  if (!draft) return <p className="body-large">正在读取设置…</p>

  const hint =
    draft.preset === 'custom'
      ? '任何兼容 OpenAI Chat Completions 的接口都可以。地址用 https，密钥不要写进地址。'
      : PRESETS[draft.preset].hint

  return (
    <div className="stack">
      <p className="body-medium on-surface-variant">密钥只保存在这台浏览器里。标题、简介和字幕只会发给你填写的接口。</p>
      <PresetSelect
        value={draft.preset}
        onChange={(preset) => {
          setNote(null)
          setDraft(applyPreset(preset, draft))
        }}
      />
      <TextField
        label="Base URL"
        value={draft.baseUrl}
        supportingText={hint}
        onChange={(baseUrl) => {
          setNote(null)
          const preset =
            draft.preset !== 'custom' && PRESETS[draft.preset].baseUrl === baseUrl ? draft.preset : 'custom'
          setDraft({ ...draft, baseUrl, preset })
        }}
      />
      <ModelField
        preset={draft.preset}
        model={draft.model}
        onChange={(model) => {
          setNote(null)
          setDraft({ ...draft, model })
        }}
      />
      <ThinkingControl
        value={draft.thinking}
        onChange={(thinking) => {
          setNote(null)
          setDraft({ ...draft, thinking })
        }}
      />
      <OutputSelect
        value={draft.output}
        onChange={(output) => {
          setNote(null)
          setDraft({ ...draft, output })
        }}
      />
      {draft.output === 'plugin' ? null : (
        <div className="stack">
          <p className="body-medium on-surface-variant">
            {folderName ? `当前文件夹：${folderName}` : '还没有选择文件夹。总结会写成 Markdown 文件。'}
          </p>
          <md-outlined-button
            onClick={() => {
              void pickSummaryFolder()
                .then((name) => {
                  setFolderName(name)
                  setFailure(null)
                  setNote(`已选择文件夹「${name}」。记得再点保存。`)
                })
                .catch((caught: unknown) => {
                  if (caught instanceof DOMException && caught.name === 'AbortError') return
                  setFailure(caught instanceof Error ? caught.message : '选择文件夹失败')
                })
            }}
          >
            选择文件夹
          </md-outlined-button>
        </div>
      )}
      <TextField
        label="API Key"
        type={showKey ? 'text' : 'password'}
        value={draft.apiKey}
        onChange={(apiKey) => {
          setNote(null)
          setDraft({ ...draft, apiKey })
        }}
      />
      <div className="field-toggle">
        <md-text-button
          onClick={() => setShowKey((value) => !value)}
          hasIcon
          aria-label={showKey ? '隐藏密钥' : '显示密钥'}
        >
          <SymbolIcon slot="icon" name={showKey ? 'visibilityOff' : 'visibility'} />
          {showKey ? '隐藏密钥' : '显示密钥'}
        </md-text-button>
      </div>
      {failure ? (
        <div className="banner banner--error" role="alert">
          <SymbolIcon name="error" />
          <p className="body-medium">{failure}</p>
        </div>
      ) : null}
      {note ? <p className="body-medium primary">{note}</p> : null}
      <md-filled-button
        disabled={saving}
        onClick={() => {
          setSaving(true)
          setFailure(null)
          void onSave(draft)
            .then(() => setNote('已保存在这台浏览器里。'))
            .catch((caught: unknown) => setFailure(caught instanceof Error ? caught.message : '设置没有保存'))
            .finally(() => setSaving(false))
        }}
      >
        {saving ? '正在保存…' : '保存'}
      </md-filled-button>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  supportingText,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  supportingText?: string
}) {
  const ref = useFieldValue(value, onChange)
  return <md-filled-text-field ref={ref} label={label} type={type} value={value} supportingText={supportingText} />
}

function ModelField({ preset, model, onChange }: { preset: PresetId; model: string; onChange: (model: string) => void }) {
  const choices = modelsFor(preset)
  const manual = preset === 'custom' || !choices.some((choice) => choice.id === model)
  return (
    <>
      {choices.length > 0 ? (
        <ChoiceSelect
          label="模型"
          value={manual ? '__manual__' : model}
          options={[...choices.map((choice) => ({ value: choice.id, label: choice.label })), { value: '__manual__', label: '手动填写' }]}
          onChange={(next) => {
            if (next === '__manual__') {
              if (!manual) onChange('')
              return
            }
            onChange(next)
          }}
        />
      ) : null}
      {manual ? <TextField label="模型名" value={model} onChange={onChange} /> : null}
    </>
  )
}

function ThinkingControl({ value, onChange }: { value: number; onChange: (thinking: number) => void }) {
  const ref = useRef<(HTMLElement & { value: number }) | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const handler = () => {
      if (Number.isFinite(node.value)) onChange(Math.round(node.value))
    }
    node.addEventListener('input', handler)
    node.addEventListener('change', handler)
    return () => {
      node.removeEventListener('input', handler)
      node.removeEventListener('change', handler)
    }
  }, [onChange])
  useEffect(() => {
    const node = ref.current
    if (node && node.value !== value) node.value = value
  }, [value])
  const label = THINKING_LABELS[value] ?? THINKING_LABELS[0]
  return (
    <div className="stack">
      <div className="row">
        <p className="title-small">思考强度</p>
        <p className="label-large primary">{label}</p>
      </div>
      <md-slider
        ref={ref}
        min={0}
        max={4}
        step={1}
        value={value}
        labeled
        valueLabel={label}
        aria-label="思考强度"
      />
      <p className="body-small on-surface-variant">关闭最快。调高后模型会先想再答，更慢，也更适合难一点的视频。</p>
    </div>
  )
}

function ChoiceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const ref = useFieldValue(value, onChange)
  return (
    <md-filled-select ref={ref} label={label} menuPositioning="popover" value={value}>
      {options.map((option) => (
        <md-select-option key={option.value} value={option.value} selected={option.value === value}>
          <div slot="headline">{option.label}</div>
        </md-select-option>
      ))}
    </md-filled-select>
  )
}

function OutputSelect({ value, onChange }: { value: SummaryOutput; onChange: (output: SummaryOutput) => void }) {
  const ref = useFieldValue(value, (next) => {
    if (next === 'plugin' || next === 'folder' || next === 'both') onChange(next)
  })
  return (
    <md-filled-select ref={ref} label="总结放在哪里" menuPositioning="popover" value={value}>
      {OUTPUT_OPTIONS.map((option) => (
        <md-select-option key={option.value} value={option.value} selected={option.value === value}>
          <div slot="headline">{option.label}</div>
        </md-select-option>
      ))}
    </md-filled-select>
  )
}

function PresetSelect({ value, onChange }: { value: PresetId; onChange: (preset: PresetId) => void }) {
  const ref = useFieldValue(value, (next) => {
    if (isPreset(next)) onChange(next)
  })
  return (
    <md-filled-select ref={ref} label="接口" menuPositioning="popover" value={value}>
      {PRESET_OPTIONS.map((option) => (
        <md-select-option key={option.value} value={option.value} selected={option.value === value}>
          <div slot="headline">{option.label}</div>
        </md-select-option>
      ))}
    </md-filled-select>
  )
}
