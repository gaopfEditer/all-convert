import { useQuery } from '@tanstack/react-query'
import { getFormatTargets } from '../api/client'

interface FormatSelectorProps {
  sourceFormat: string | null
  value: string | null
  onChange: (format: string | null) => void
  disabled?: boolean
}

export function FormatSelector({
  sourceFormat,
  value,
  onChange,
  disabled,
}: FormatSelectorProps) {
  const normalized = sourceFormat?.replace(/^jpeg$/i, 'jpg') ?? null

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['targets', normalized],
    queryFn: () => getFormatTargets(normalized!),
    enabled: Boolean(normalized),
    staleTime: 60_000,
  })

  if (!normalized) {
    return (
      <span className="text-xs text-slate-400">上传后检测格式</span>
    )
  }

  if (isLoading) {
    return <span className="text-xs text-slate-500">加载可用格式…</span>
  }

  if (isError) {
    const msg =
      error instanceof Error ? error.message : '无法加载目标格式'
    return <span className="text-xs text-red-600">{msg}</span>
  }

  const targets = data?.targets ?? []
  if (targets.length === 0) {
    return (
      <span className="text-xs text-amber-700">后端暂不支持此源格式</span>
    )
  }

  return (
    <select
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="目标格式"
    >
      <option value="">选择目标格式</option>
      {targets.map((t) => (
        <option key={t.format} value={t.format}>
          {t.format.toUpperCase()}
          {t.status !== 'production' ? ` (${t.status})` : ''}
        </option>
      ))}
    </select>
  )
}
