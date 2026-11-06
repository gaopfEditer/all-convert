import type { BatchDetail } from '../api/types'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '待设置',
  UPLOADING: '上传中',
  QUEUED: '排队中',
  PROCESSING: '转换中',
  SUCCESS: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
}

interface ConversionProgressProps {
  batch: BatchDetail | null
}

export function ConversionProgress({ batch }: ConversionProgressProps) {
  if (!batch || batch.summary.total === 0) {
    return null
  }

  const { total, success, failed, processing } = batch.summary
  const done = success + failed
  const phase =
    processing > 0
      ? '正在处理'
      : done === total
        ? failed > 0
          ? '部分失败'
          : '全部完成'
        : '等待中'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">批次进度</h3>
        <span className="text-xs text-slate-500">{phase}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="总计" value={total} />
        <Stat label="成功" value={success} tone="ok" />
        <Stat label="失败" value={failed} tone={failed ? 'bad' : undefined} />
        <Stat label="处理中/排队" value={processing} tone="active" />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        进度按任务阶段展示，不使用伪造百分比（后端未提供精确进度时）。
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'ok' | 'bad' | 'active'
}) {
  const color =
    tone === 'ok'
      ? 'text-emerald-700'
      : tone === 'bad'
        ? 'text-red-700'
        : tone === 'active'
          ? 'text-sky-700'
          : 'text-slate-800'
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}
