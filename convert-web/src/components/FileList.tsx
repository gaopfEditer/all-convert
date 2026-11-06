import type { FileSummary } from '../api/types'
import { formatBytes } from '../lib/formatBytes'
import type { LocalQueueItem } from '../hooks/useBatchWorkspace'
import { FormatSelector } from './FormatSelector'
import { statusLabel } from './ConversionProgress'

interface FileListProps {
  queue: LocalQueueItem[]
  serverFiles: FileSummary[]
  onRemoveLocal: (localId: string) => void
  onTargetChange: (localId: string, target: string | null) => void
}

export function FileList({
  queue,
  serverFiles,
  onRemoveLocal,
  onTargetChange,
}: FileListProps) {
  if (queue.length === 0 && serverFiles.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">尚未添加文件</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">文件名</th>
            <th className="px-3 py-2 font-medium">大小</th>
            <th className="px-3 py-2 font-medium">源格式</th>
            <th className="px-3 py-2 font-medium">目标</th>
            <th className="px-3 py-2 font-medium">状态</th>
            <th className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item) => (
            <tr key={item.localId} className="border-b border-slate-100">
              <td className="px-3 py-2 max-w-[200px] truncate" title={item.file.name}>
                {item.file.name}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatBytes(item.file.size)}</td>
              <td className="px-3 py-2 uppercase text-slate-600">
                {item.guessedFormat ?? '—'}
              </td>
              <td className="px-3 py-2">
                <FormatSelector
                  sourceFormat={item.guessedFormat}
                  value={item.targetFormat}
                  onChange={(t) => onTargetChange(item.localId, t)}
                  disabled={Boolean(item.validationError)}
                />
              </td>
              <td className="px-3 py-2">
                {item.validationError ? (
                  <span className="text-red-600 text-xs">{item.validationError}</span>
                ) : (
                  <span className="text-slate-500 text-xs">待上传</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  className="text-xs text-slate-600 underline"
                  onClick={() => onRemoveLocal(item.localId)}
                >
                  移除
                </button>
              </td>
            </tr>
          ))}
          {serverFiles.map((f) => (
            <tr key={f.file_id} className="border-b border-slate-100">
              <td className="px-3 py-2 max-w-[200px] truncate" title={f.original_name}>
                {f.original_name}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatBytes(f.size_bytes)}</td>
              <td className="px-3 py-2 uppercase">{f.detected_format ?? '—'}</td>
              <td className="px-3 py-2 uppercase">{f.target_format ?? '—'}</td>
              <td className="px-3 py-2">
                <StatusBadge status={f.status} error={f.error?.message} />
              </td>
              <td className="px-3 py-2 text-xs text-slate-400">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({
  status,
  error,
}: {
  status: string
  error?: string | null
}) {
  const base = 'inline-flex rounded px-2 py-0.5 text-xs font-medium'
  const tone =
    status === 'SUCCESS'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'FAILED'
        ? 'bg-red-100 text-red-800'
        : status === 'PROCESSING' || status === 'QUEUED'
          ? 'bg-sky-100 text-sky-800'
          : 'bg-slate-100 text-slate-700'

  return (
    <span title={error ?? undefined}>
      <span className={`${base} ${tone}`}>{statusLabel(status)}</span>
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : null}
    </span>
  )
}
