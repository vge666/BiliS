import { useEffect, useState } from 'react'
import { PRESETS, applyPreset } from '../lib/endpoints.ts'
import type { PresetId, Settings } from '../lib/types.ts'
import { useFieldValue } from './fields.tsx'
import { SymbolIcon } from './icons.tsx'

const PRESET_OPTIONS: { value: PresetId; label: string }[] = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: '自定义' },
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
      <TextField
        label="模型"
        value={draft.model}
        onChange={(model) => {
          setNote(null)
          setDraft({ ...draft, model })
        }}
      />
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

function PresetSelect({ value, onChange }: { value: PresetId; onChange: (preset: PresetId) => void }) {
  const ref = useFieldValue(value, (next) => {
    if (next === 'deepseek' || next === 'kimi' || next === 'openai' || next === 'custom') onChange(next)
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
