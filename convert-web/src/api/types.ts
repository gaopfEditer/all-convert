export type FileStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'

export type BatchStatus =
  | 'OPEN'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'EXPIRED'

export interface ApiErrorBody {
  error_code?: string
  message?: string
  file_id?: string
  retryable?: boolean
}

export interface BatchResponse {
  batch_id: string
  expires_at: string
  status: BatchStatus
}

export interface FileSummary {
  file_id: string
  original_name: string
  detected_format: string | null
  target_format: string | null
  status: FileStatus
  size_bytes: number
  error: { code?: string; message?: string } | null
}

export interface BatchDetail {
  batch_id: string
  status: BatchStatus
  expires_at: string
  summary: {
    total: number
    success: number
    failed: number
    processing: number
  }
  files: FileSummary[]
}

export interface UploadAccepted {
  file_id: string
  status: FileStatus
}

export interface UploadRejected {
  name: string
  reason: string
  file_id?: string
}

export interface UploadResponse {
  accepted: UploadAccepted[]
  rejected: UploadRejected[]
}

export interface TargetItem {
  format: string
  status: string
  default_engine: string | null
}

export interface TargetsResponse {
  source: string
  targets: TargetItem[]
}

export interface HealthResponse {
  status: string
  version?: string
}
