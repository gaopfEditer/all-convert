import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiClientError,
  createBatch,
  getBatch,
  getHealth,
  uploadBatchFiles,
} from '../api/client'
import type { BatchDetail, FileSummary } from '../api/types'
import { rememberBatch } from '../lib/recentBatches'
import { guessFormatFromName, isBlockedExtension } from '../lib/fileExtension'

export interface LocalQueueItem {
  localId: string
  file: File
  guessedFormat: string | null
  targetFormat: string | null
  duplicateOf?: string
  validationError?: string
}

export interface WorkspaceState {
  batchId: string | null
  batch: BatchDetail | null
  queue: LocalQueueItem[]
  uploading: boolean
  globalError: string | null
  apiOnline: boolean | null
}

function newLocalId(): string {
  return crypto.randomUUID()
}

function validateLocalFile(file: File, existing: LocalQueueItem[]): LocalQueueItem {
  const guessedFormat = guessFormatFromName(file.name)
  let validationError: string | undefined
  let duplicateOf: string | undefined

  if (isBlockedExtension(file.name)) {
    validationError = '此类型文件不允许上传'
  }
  const dup = existing.find(
    (e) => e.file.name === file.name && e.file.size === file.size,
  )
  if (dup) {
    duplicateOf = dup.localId
    validationError = '与列表中文件重复'
  }

  return {
    localId: newLocalId(),
    file,
    guessedFormat,
    targetFormat: null,
    duplicateOf,
    validationError,
  }
}

export function useBatchWorkspace() {
  const [batchId, setBatchId] = useState<string | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('batch')
    return fromUrl
  })
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [queue, setQueue] = useState<LocalQueueItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const pollRef = useRef<number | null>(null)

  const ensureBatch = useCallback(async (): Promise<string> => {
    if (batchId) return batchId
    const created = await createBatch({})
    setBatchId(created.batch_id)
    const url = new URL(window.location.href)
    url.searchParams.set('batch', created.batch_id)
    window.history.replaceState({}, '', url.toString())
    return created.batch_id
  }, [batchId])

  const refreshBatch = useCallback(async (id: string) => {
    const detail = await getBatch(id)
    setBatch(detail)
    rememberBatch(detail)
    return detail
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (batchId) {
          await refreshBatch(batchId)
        } else {
          await getHealth()
        }
        if (!cancelled) setApiOnline(true)
      } catch (e) {
        if (!cancelled) {
          setApiOnline(false)
          if (e instanceof ApiClientError) {
            setGlobalError(e.message)
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [batchId, refreshBatch])

  const shouldPoll = useMemo(() => {
    if (!batch) return false
    return batch.summary.processing > 0
  }, [batch])

  useEffect(() => {
    if (!batchId || !shouldPoll) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    pollRef.current = window.setInterval(() => {
      refreshBatch(batchId).catch(() => {})
    }, 2000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [batchId, shouldPoll, refreshBatch])

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    setQueue((prev) => {
      const added = list.map((f) => validateLocalFile(f, prev))
      return [...prev, ...added]
    })
  }, [])

  const removeLocal = useCallback((localId: string) => {
    setQueue((prev) => prev.filter((q) => q.localId !== localId))
  }, [])

  const setTarget = useCallback((localId: string, target: string | null) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.localId === localId ? { ...q, targetFormat: target } : q,
      ),
    )
  }, [])

  const startUpload = useCallback(async () => {
    setGlobalError(null)
    const ready = queue.filter((q) => !q.validationError && q.targetFormat)
    if (ready.length === 0) {
      setGlobalError('请为每个文件选择目标格式后再开始转换')
      return
    }
    const skipped = queue.filter((q) => q.validationError)
    if (ready.length === 0 && skipped.length > 0) {
      setGlobalError('没有可上传的有效文件')
      return
    }

    setUploading(true)
    try {
      const id = await ensureBatch()
      const res = await uploadBatchFiles(
        id,
        ready.map((r) => r.file),
        ready.map((r) => r.targetFormat),
      )
      if (res.rejected.length > 0) {
        const reasons = res.rejected
          .map((r) => `${r.name}: ${r.reason}`)
          .join('；')
        setGlobalError(`部分文件被拒绝：${reasons}`)
      }
      setQueue((prev) =>
        prev.filter(
          (q) =>
            !ready.some(
              (r) => r.file.name === q.file.name && r.file.size === q.file.size,
            ),
        ),
      )
      await refreshBatch(id)
    } catch (e) {
      setGlobalError(
        e instanceof ApiClientError ? e.message : '上传失败，请稍后重试',
      )
    } finally {
      setUploading(false)
    }
  }, [queue, ensureBatch, refreshBatch])

  const serverFiles: FileSummary[] = batch?.files ?? []

  const resumeBatch = useCallback(
    async (id: string) => {
      setBatchId(id)
      const url = new URL(window.location.href)
      url.searchParams.set('batch', id)
      window.history.replaceState({}, '', url.toString())
      await refreshBatch(id)
    },
    [refreshBatch],
  )

  return {
    batchId,
    batch,
    queue,
    uploading,
    globalError,
    setGlobalError,
    apiOnline,
    serverFiles,
    addFiles,
    removeLocal,
    setTarget,
    startUpload,
    refreshBatch,
    resumeBatch,
  }
}
