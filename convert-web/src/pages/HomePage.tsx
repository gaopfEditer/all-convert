import { useState } from 'react'
import { useBatchWorkspace } from '../hooks/useBatchWorkspace'
import { FileUploader } from '../components/FileUploader'
import { FileList } from '../components/FileList'
import { ConversionProgress } from '../components/ConversionProgress'
import { ConversionResult } from '../components/ConversionResult'
import { BatchActions } from '../components/BatchActions'
import { ConversionSettings } from '../components/ConversionSettings'
import { ErrorDisplay } from '../components/ErrorDisplay'
import { loadRecentBatches } from '../lib/recentBatches'

const CATEGORIES = [
  { id: 'document', label: '文档', hint: 'DOCX、PDF、TXT…' },
  { id: 'image', label: '图片', hint: 'PNG、JPG、WEBP…' },
  { id: 'video', label: '视频', hint: 'MP4、WEBM…' },
  { id: 'audio', label: '音频', hint: 'WAV、MP3…' },
  { id: 'ebook', label: '电子书', hint: 'EPUB、MOBI…' },
  { id: 'archive', label: '压缩包', hint: 'ZIP、RAR…' },
]

export function HomePage() {
  const ws = useBatchWorkspace()
  const [imageQuality, setImageQuality] = useState(85)
  const recent = loadRecentBatches()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          全格式批量转换
        </h1>
        <p className="mt-1 text-slate-600">
          上传 → 选择目标格式 → 批量转换 → 下载。能力来自后端格式矩阵，不展示未支持的格式。
        </p>
        {ws.apiOnline === false ? (
          <p className="mt-2 text-sm text-red-700">
            无法连接转换 API（默认 http://127.0.0.1:8000）。请先启动后端 convert-platform。
          </p>
        ) : null}
      </header>

      <ErrorDisplay message={ws.globalError} onDismiss={() => ws.setGlobalError(null)} />

      <section className="mb-6">
        <FileUploader
          onFiles={ws.addFiles}
          disabled={ws.uploading || ws.apiOnline === false}
          maxHint="单文件上限由后端配置（默认约 200MB）"
        />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="font-medium text-slate-800">{c.label}</div>
            <div className="text-xs text-slate-500">{c.hint}</div>
          </div>
        ))}
      </section>

      <section className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">工作区</h2>
          <button
            type="button"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            disabled={ws.uploading || ws.queue.length === 0}
            onClick={() => void ws.startUpload()}
          >
            {ws.uploading ? '上传中…' : '开始转换'}
          </button>
        </div>
        <FileList
          queue={ws.queue}
          serverFiles={ws.serverFiles}
          onRemoveLocal={ws.removeLocal}
          onTargetChange={ws.setTarget}
        />
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <ConversionProgress batch={ws.batch} />
        <ConversionSettings
          imageQuality={imageQuality}
          onImageQualityChange={setImageQuality}
        />
      </section>

      <section className="mb-4">
        <ConversionResult files={ws.serverFiles} />
      </section>

      <section className="mb-8">
        <BatchActions
          batchId={ws.batchId}
          files={ws.serverFiles}
          onRefresh={
            ws.batchId
              ? () => void ws.refreshBatch(ws.batchId!)
              : undefined
          }
        />
      </section>

      {recent.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold mb-2">最近批次</h2>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.batch_id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-sm hover:border-sky-400"
                  onClick={() => void ws.resumeBatch(r.batch_id)}
                >
                  <span className="font-mono text-xs text-slate-500">
                    {r.batch_id.slice(0, 8)}…
                  </span>
                  <span className="ml-2">{r.status}</span>
                  <span className="ml-2 text-slate-500">
                    成功 {r.summary.success}/{r.summary.total}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
