import type {
  BatchDetail,
  BatchResponse,
  HealthResponse,
  TargetsResponse,
  UploadResponse,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export class ApiClientError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.body = body
  }
}

async function parseError(res: Response): Promise<ApiClientError> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = await res.text().catch(() => undefined)
  }
  const msg =
    typeof body === 'object' &&
    body !== null &&
    'detail' in body &&
    typeof (body as { detail: unknown }).detail === 'string'
      ? (body as { detail: string }).detail
      : res.statusText || `HTTP ${res.status}`
  return new ApiClientError(msg, res.status, body)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw await parseError(res)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/v1/health')
}

export async function createBatch(body: {
  ttl_seconds?: number
  default_target_format?: string | null
} = {}): Promise<BatchResponse> {
  return request<BatchResponse>('/v1/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getBatch(batchId: string): Promise<BatchDetail> {
  return request<BatchDetail>(`/v1/batches/${batchId}`)
}

export async function uploadBatchFiles(
  batchId: string,
  files: File[],
  targets?: (string | null)[],
): Promise<UploadResponse> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  if (targets && targets.length > 0) {
    form.append('targets', JSON.stringify(targets))
  }
  return request<UploadResponse>(`/v1/batches/${batchId}/files`, {
    method: 'POST',
    body: form,
  })
}

export async function getFormatTargets(
  sourceFormat: string,
  includeExperimental = false,
): Promise<TargetsResponse> {
  const q = includeExperimental ? '?include_experimental=true' : ''
  return request<TargetsResponse>(
    `/v1/formats/${encodeURIComponent(sourceFormat)}/targets${q}`,
  )
}

export function downloadFileUrl(fileId: string): string {
  return `${API_BASE}/v1/files/${fileId}/download`
}

export async function downloadBatchZip(batchId: string): Promise<Response> {
  const res = await fetch(`${API_BASE}/v1/batches/${batchId}/download.zip`)
  if (!res.ok) {
    throw await parseError(res)
  }
  return res
}
