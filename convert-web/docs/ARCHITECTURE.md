# 系统架构

## 1. 现状（2026-11-06 环境勘察）

| 项 | 结果 |
|----|------|
| 项目目录 | 工作区为空，** greenfield** |
| 宿主 OS | Windows 10 |
| Python | 3.12.10 可用 |
| Docker | PATH 未检测到，Compose 部署需先安装 |
| 本地引擎 | ffmpeg / ImageMagick / LibreOffice 未在 PATH 确认 → **以容器内预装为准** |

**推荐运行时**：Linux 容器（Docker Compose）承载 API + Worker + Redis + DB + 引擎二进制。

## 2. 逻辑架构

```
                    ┌─────────────────┐
                    │   Client / FE   │
                    └────────┬────────┘
                             │ HTTPS REST
                    ┌────────▼────────┐
                    │   API Service   │  FastAPI
                    │  (stateless)    │
                    └───┬──────┬──────┘
                        │      │
           ┌────────────▼      └────────────┐
           │ PostgreSQL / SQLite            │
           │ batches, files, jobs, caps     │
           └────────────┬───────────────────┘
                        │
           ┌────────────▼────────────┐
           │   Redis (broker)      │
           └────────────┬──────────┘
                        │
           ┌────────────▼────────────┐
           │   Worker(s)             │
           │   Celery / RQ           │
           └───┬─────────────────────┘
               │
    ┌──────────┼──────────┬─────────────┐
    ▼          ▼          ▼             ▼
 LibreOffice FFmpeg  ImageMagick   Calibre …
    │          │          │             │
    └──────────┴──────────┴─────────────┘
                        │
              ┌─────────▼─────────┐
              │ Local Object Store │
              │ (volume: /data)    │
              └───────────────────┘
```

## 3. 模块职责（与任务书对齐）

| # | 模块 | 职责 |
|---|------|------|
| 1 | **File Upload Service** | multipart 接收、校验、写入 staging、创建 File 记录 |
| 2 | **File Type Detection** | magic + libmagic/python-magic；映射到内部 `MediaCategory` |
| 3 | **Format Capability Registry** | 源→目标有向边；来源=适配器声明+集成测试；API 只读暴露 |
| 4 | **Conversion Engine Registry** | 引擎健康检查、版本、支持类别 |
| 5 | **Conversion Job Manager** | 创建 job、状态机、取消、重试计数 |
| 6 | **Queue / Worker** | 异步执行 `run_conversion(job_id)` |
| 7 | **Conversion Result Manager** | 输出路径、校验输出魔数、生成下载响应 |
| 8 | **File Storage Manager** | 目录布局、`uploads/{batch}/{file_id}/`、`outputs/`、配额 |
| 9 | **Retry Manager** | 退避策略、dead letter（可选） |
| 10 | **Cleanup Manager** | TTL 扫描、孤儿目录、失败 staging |

**横切**：认证（v1 可选 API Key）、审计日志、指标（Prometheus 可选 v1.1）。

## 4. 数据流（ happy path ）

1. `POST /v1/batches` → 创建 batch，返回 `batch_id`。
2. `POST /v1/batches/{id}/files` → 多文件上传，每文件 `QUEUED`（若已指定 target 则入队）。
3. Worker 取 job → `PROCESSING` → 调用 **Adapter** → 写 output → 验证 → `SUCCESS`。
4. `GET /v1/batches/{id}` 聚合状态；`GET /v1/files/{id}/download` 取结果。
5. Cleanup 在 `expires_at` 后删除磁盘与行记录。

## 5. 存储布局

```
/data/
  staging/          # 上传后待检测
  work/             # 引擎隔离工作区（每 job 一目录，用完删）
  outputs/          # 成功产物
  quarantine/       # 安全拒绝样本（可选，短 TTL）
```

DB 表（概念）：

- `batches`：id, created_at, expires_at, status
- `files`：id, batch_id, original_name, detected_mime, detected_format, size, status, error_*
- `jobs`：id, file_id, target_format, engine_id, params_json, retry_count, started_at, finished_at
- `capabilities`：source_format, target_format, engine_id, status(production|experimental), last_verified_at

## 6. 任务队列设计

**选型**：Redis + **Celery**（成熟、超时/重试内置）或 **RQ**（更简单，适合小团队）。

| 队列 | 用途 |
|------|------|
| `convert.default` | 通用转换 |
| `convert.heavy` | 视频、大 PDF（独立 concurrency） |
| `maintenance.cleanup` | 定时清理 |

**并发模型**：

- API 进程不跑转换。
- Worker `concurrency=2` 起（视频 worker 单独 scale）。
- 每 job 硬超时（如 document 120s, video 600s），超时 → FAILED + 可重试。

**幂等**：job_id 唯一；worker 重复消费时检查状态，非 QUEUED/PROCESSING 则 skip。

## 7. 适配器模式

见 `ENGINE_ADAPTERS.md`。业务层仅依赖：

```python
class ConversionAdapter(Protocol):
    engine_id: str
    def supported_pairs(self) -> list[FormatPair]: ...
    def convert(self, ctx: ConversionContext) -> ConversionResult: ...
    def healthcheck(self) -> EngineHealth: ...
```

`ConversionContext`：`input_path`, `output_path`, `source_format`, `target_format`, `params`, `limits`.

## 8. 技术栈建议（无既有栈）

| 层 | 选择 | 理由 |
|----|------|------|
| API | Python 3.12 + FastAPI | 类型友好、OpenAPI 自动生成 |
| ORM | SQLAlchemy 2 + Alembic | 迁移清晰 |
| DB | SQLite（dev）/ PostgreSQL（prod compose） | 规模可切换 |
| Queue | Redis 7 + Celery 5 | 生态成熟 |
| 检测 | python-magic（libmagic） | 魔数 |
| 测试 | pytest + httpx | API + 引擎集成 |
| 容器 | Docker Compose 多 stage | 引擎依赖重，与 API 镜像分离可选 |

## 9. 部署拓扑（Compose 服务）

- `api`：uvicorn，挂载只读配置 + `/data`
- `worker`：同代码镜像，command=celery worker
- `worker-video`：同上，队列=heavy，资源 limit
- `redis`
- `db`（postgres 可选 profile）
- `beat`：Celery beat 触发 cleanup

引擎二进制打进 `worker` 镜像（Dockerfile.worker），避免 API 镜像膨胀。

## 10. 与 Aconvert 的差异（刻意）

- v1 无 Webpage URL 转换、无在线 Analyze 文件指纹营销页。
- 能力矩阵以**实测注册**为准，不复制站点「单页万能下拉」式 UI 承诺。
- 批处理与 API 一等公民；站点偏同步单页体验。
