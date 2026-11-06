import { useState } from 'react'
import type { FileSummary } from '../api/types'
import { ApiClientError, downloadBatchZip, downloadFileUrl } from '../api/client'

interface BatchActionsProps {
  batchId: string | null
  files: FileSummary[]
  onRefresh?: () => void
}

export function BatchActions({ batchId, files, onRefresh }: BatchActionsProps) {
  const [zipError, setZipError] = useState<string | null>(null)
  const successFiles = files.filter((f) => f.status === 'SUCCESS')

  const downloadAllZip = async () => {
    if (!batchId) return
    setZipError(null)
    try {
      const res = await downloadBatchZip(batchId)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${batchId.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        setZipError('后端尚未提供 ZIP 下载；请使用单文件下载，或见 docs/BACKEND_GAPS.md')
      } else {
        setZipError(e instanceof Error ? e.message : 'ZIP 下载失败')
      }
    }
  }

  const downloadAllIndividual = () => {
    for (const f of successFiles) {
      const a = document.createElement('a')
      a.href = downloadFileUrl(f.file_id)
      a.download = ''
      a.click()
    }
  }

  if (!batchId || files.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        disabled={successFiles.length === 0}
        onClick={downloadAllZip}
      >
        下载全部 ZIP
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        disabled={successFiles.length === 0}
        onClick={downloadAllIndividual}
      >
        逐个下载成功文件
      </button>
      {onRefresh ? (
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          onClick={onRefresh}
        >
          刷新状态
        </button>
      ) : null}
      {zipError ? (
        <p className="w-full text-xs text-amber-800">{zipError}</p>
      ) : null}
    </div>
  )
}
