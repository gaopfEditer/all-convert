import type { FileSummary } from '../api/types'
import { downloadFileUrl } from '../api/client'
import { formatBytes } from '../lib/formatBytes'
import { statusLabel } from './ConversionProgress'

interface ConversionResultProps {
  files: FileSummary[]
}

export function ConversionResult({ files }: ConversionResultProps) {
  const finished = files.filter(
    (f) => f.status === 'SUCCESS' || f.status === 'FAILED',
  )
  if (finished.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">转换结果</h3>
      <ul className="mt-3 space-y-2">
        {finished.map((f) => (
          <li
            key={f.file_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{f.original_name}</div>
              <div className="text-xs text-slate-500">
                {f.detected_format?.toUpperCase()} →{' '}
                {f.target_format?.toUpperCase() ?? '?'} ·{' '}
                {formatBytes(f.size_bytes)} · {statusLabel(f.status)}
              </div>
              {f.error?.message ? (
                <div className="text-xs text-red-600">{f.error.message}</div>
              ) : null}
            </div>
            {f.status === 'SUCCESS' ? (
              <a
                href={downloadFileUrl(f.file_id)}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                download
              >
                下载
              </a>
            ) : (
              <span className="text-xs text-slate-400">不可下载</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
