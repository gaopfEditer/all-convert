import type { BatchDetail } from '../api/types'

const KEY = 'aconvert.recentBatches'
const MAX = 8

export interface RecentBatchEntry {
  batch_id: string
  updated_at: string
  status: string
  summary: BatchDetail['summary']
}

export function loadRecentBatches(): RecentBatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentBatchEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function rememberBatch(detail: BatchDetail): void {
  const entry: RecentBatchEntry = {
    batch_id: detail.batch_id,
    updated_at: new Date().toISOString(),
    status: detail.status,
    summary: detail.summary,
  }
  const rest = loadRecentBatches().filter((b) => b.batch_id !== detail.batch_id)
  const next = [entry, ...rest].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}
