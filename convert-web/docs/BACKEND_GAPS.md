# 后端缺口清单（前端集成视角）

对照 `docs/API_SPEC.md` 与当前 `convert-platform` 实现（2026-11-06）。

| 契约端点 | 状态 | 前端行为 |
|----------|------|----------|
| `POST /v1/batches` | ✅ | 首次上传前创建 |
| `GET /v1/batches/{id}` | ✅ | 轮询与刷新 |
| `POST /v1/batches/{id}/files` | ✅ | 多文件 + `targets` JSON |
| `GET /v1/formats/{source}/targets` | ✅ | 格式选择器 |
| `GET /v1/files/{id}/download` | ✅ | 单文件下载 |
| `GET /v1/health` | ✅ | 连通性检测 |
| `GET /v1/formats` | ❌ | 首页类别仅静态说明 |
| `PATCH /v1/files/{id}` | ❌ | 上传前必须在本地选好目标格式 |
| `POST /v1/files/{id}/convert` | ❌ | 依赖上传时带 target |
| `POST /v1/files/{id}/retry` | ❌ | UI 未提供重试按钮 |
| `POST /v1/files/{id}/cancel` | ❌ | — |
| `GET /v1/batches/{id}/download.zip` | ❌ | 尝试 ZIP，404 时提示逐个下载 |
| `DELETE /v1/batches/{id}` | ❌ | — |
| CORS | ❌ | 开发依赖 Vite proxy；生产需 API 加 CORS 或同域反代 |

后端仓库路径（Bot A）：`convert-platform`（产品设计线程工作区）。
