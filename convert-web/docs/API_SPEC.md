# REST API 契约（v1 草案）

**Base URL**：`/v1`  
**格式**：JSON（除 upload/download 为 multipart/octet-stream）  
**认证**：v1 可选 `Authorization: Bearer <api_key>`；未配置时仅本地开发。

OpenAPI 3.1 由 FastAPI 自动生成于 `/docs`。

## 1. 通用类型

### FileStatus

`PENDING` | `UPLOADING` | `QUEUED` | `PROCESSING` | `SUCCESS` | `FAILED` | `CANCELLED`

### BatchStatus

`OPEN` | `PROCESSING` | `COMPLETED` | `PARTIAL_FAILED` | `FAILED` | `EXPIRED`

### ErrorBody

```json
{
  "error_code": "UNSUPPORTED_PAIR",
  "message": "Cannot convert HEIC to SVG",
  "file_id": "uuid",
  "retryable": false
}
```

## 2. 格式能力

### GET /formats

返回所有已注册源格式及类别。

**200**

```json
{
  "formats": [
    {"id": "docx", "category": "document", "mime_types": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
  ]
}
```

### GET /formats/{source_format}/targets

**Query**：`include=experimental`（默认 false）

**200**

```json
{
  "source": "docx",
  "targets": [
    {"format": "pdf", "status": "production", "default_engine": "libreoffice"}
  ]
}
```

## 3. 批任务

### POST /batches

创建空批任务。

**Request**

```json
{
  "ttl_seconds": 3600,
  "default_target_format": null
}
```

**201**

```json
{
  "batch_id": "uuid",
  "expires_at": "2026-11-06T15:00:00+08:00",
  "status": "OPEN"
}
```

### GET /batches/{batch_id}

**200**

```json
{
  "batch_id": "uuid",
  "status": "PROCESSING",
  "expires_at": "...",
  "summary": {"total": 3, "success": 1, "failed": 0, "processing": 2},
  "files": [
    {
      "file_id": "uuid",
      "original_name": "a.docx",
      "detected_format": "docx",
      "target_format": "pdf",
      "status": "SUCCESS",
      "size_bytes": 1024,
      "error": null
    }
  ]
}
```

### DELETE /batches/{batch_id}

取消未开始任务并删除关联文件（204）。

## 4. 上传

### POST /batches/{batch_id}/files

**Content-Type**：`multipart/form-data`

| 字段 | 说明 |
|------|------|
| `files` | 重复字段，多文件 |
| `targets` | 可选 JSON 数组，与 files 顺序对齐；缺省用 batch 默认或后续 PATCH |

**201**

```json
{
  "accepted": [{"file_id": "uuid", "status": "QUEUED"}],
  "rejected": [{"name": "bad.exe", "reason": "BLOCKED_TYPE"}]
}
```

### PATCH /files/{file_id}

**Request**

```json
{
  "target_format": "pdf",
  "params": {"pdf_quality": "high"}
}
```

若文件仍为 PENDING/QUEUED，可改目标并触发入队。

## 5. 转换控制

### POST /files/{file_id}/convert

显式触发（若上传时未指定 target）。**202** + job 信息。

### POST /files/{file_id}/retry

仅 `FAILED` 且 `retryable=true`。**202**

### POST /files/{file_id}/cancel

`QUEUED` 或 `PROCESSING`（best-effort 杀 worker）。**200**

## 6. 下载

### GET /files/{file_id}/download

**200** `Content-Disposition: attachment` 单文件。

### GET /batches/{batch_id}/download.zip

**200** ZIP；可选 query `failed_manifest=true` 含 `errors.json`。

## 7. 健康与运维

### GET /health

```json
{"status": "ok", "version": "0.1.0"}
```

### GET /health/engines

各引擎 `healthy|degraded|down` 与版本。

## 8. 转换参数（params 摘要）

| 类别 | 键 | 类型 | 说明 |
|------|-----|------|------|
| image | quality | int 1-100 | JPEG/WebP |
| image | width, height | int | 缩放 |
| video | crf | int | x264/x265 |
| video | audio_bitrate | string | 如 128k |
| document | pdf_export | bool | LO 导出 PDF |
| pdf | dpi | int |  rasterize |

非法 params → 400 `INVALID_PARAMS`（不进入队列）。

## 9. HTTP 状态码约定

| 码 | 场景 |
|----|------|
| 400 | 校验失败、不支持组合 |
| 404 | batch/file 不存在或已过期 |
| 409 | 状态不允许（如对 SUCCESS retry） |
| 413 | 文件过大 |
| 422 | OpenAPI 校验 |
| 503 | 全部 engine down |

## 10. 调用示例（curl）

```bash
# 创建批
BATCH=$(curl -s -X POST http://localhost:8000/v1/batches -H "Content-Type: application/json" -d "{}" | jq -r .batch_id)

# 上传
curl -X POST "http://localhost:8000/v1/batches/$BATCH/files" \
  -F "files=@sample.docx" \
  -F 'targets=["pdf"]'

# 轮询
curl "http://localhost:8000/v1/batches/$BATCH"

# 下载
curl -OJ "http://localhost:8000/v1/files/{file_id}/download"
```

Webhook（`batch.completed`）列为 v1.1，契约预留 `callback_url` 于 batch 创建 body。
