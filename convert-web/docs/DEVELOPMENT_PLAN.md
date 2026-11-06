# 开发计划

## 0. 前置条件（当前机器）

| 项 | 状态 | 动作 |
|----|------|------|
| 项目代码 | 无 | 自 M1 初始化仓库于本工作区 |
| Python 3.12 | 有 | 本地可跑 API 单元测试（无引擎部分 skip） |
| Docker | 无 | 安装 Docker Desktop + WSL2，或纯 Linux CI 跑集成测试 |
| 转换二进制 | 未装 | **以 worker 容器为准**，不在 Windows 宿主强依赖 |

## 1. 仓库结构（拟建）

```text
convert-platform/
  app/
    api/          # FastAPI routers
    core/         # config, security
    models/       # SQLAlchemy
    services/     # upload, job, storage, cleanup
    adapters/     # engine implementations
    workers/      # celery tasks
  tests/
    unit/
    api/
    engines/
    security/
    fixtures/     # 小样本文件
  docs/           # 本目录（已建）
  docker/
    Dockerfile.api
    Dockerfile.worker
  docker-compose.yml
  pyproject.toml
  README.md
  scripts/
    install-dev.sh
    run-tests.sh
```

## 2. 阶段划分

### M0 — 设计（当前）

- [x] PRD, ARCHITECTURE, FORMAT_MATRIX, API_SPEC, ENGINE_ADAPTERS, DEVELOPMENT_PLAN
- [ ] 评审：确认 v1 最小格式子集与 RAR/HEIC 策略

### M1 — 骨架（约 3–5 天）

1. FastAPI + SQLAlchemy + Alembic + Redis + Celery 脚手架  
2. Batch/File/Job 模型与状态机  
3. Upload + magic 检测 + 本地 `/data` 存储  
4. **单一引擎** ImageMagick 或 FFmpeg 端到端  
5. pytest：API 创建 batch → 上传 → 轮询 → 下载  

**验收**：`docker compose up` 后一条 curl 完成 png→jpg。

### M2 — 引擎全覆盖（约 7–10 天）

1. 接入 LO, Calibre, Poppler/GS, 7z, Pandoc（按优先级）  
2. Capability Registry + DB seed from adapters  
3. Retry manager + 分离 heavy queue  
4. ZIP batch download + TTL cleanup beat  
5. 安全：路径、zip bomb、mime 伪装用例  

**验收**：FORMAT_MATRIX 中 v1 子集全部 integration green。

### M3 — 硬化与交付（约 3–5 天）

1. README、API 示例、验收报告 `docs/ACCEPTANCE.md`  
2. 性能冒烟：并发 10 job  
3. 可选 PostgreSQL profile  
4. CI workflow（GitHub Actions / 本地 script）  

## 3. 命令约定（目标态）

```bash
# 启动（项目根）
docker compose up --build -d

# 测试
docker compose run --rm api pytest -q
# 或
./scripts/run-tests.sh
```

本地无 Docker 时：

```bash
python -m venv .venv && pip install -e ".[dev]"
pytest tests/unit tests/api -q   # 引擎测试 skipif no binary
```

## 4. 测试策略

| 层 | 内容 |
|----|------|
| unit | 状态机、路由、文件名消毒、params 校验 |
| adapters | 每引擎 smoke + 失败样本 |
| api | httpx AsyncClient 全流程 |
| batch | 3 文件混合 + 1 损坏 |
| security | 双扩展名、zip bomb、oversized |
| cleanup | mock 时间或短 TTL 集成 |

**矩阵回归**：`tests/test_format_matrix.py` 读取 capabilities 表，parametrize 所有 production 对。

## 5. 依赖版本（建议锁定）

- fastapi >= 0.115, uvicorn, sqlalchemy >= 2.0, alembic, celery >= 5.3, redis >= 5  
- python-magic + libmagic1（容器 apt）  
- httpx, pytest, pytest-asyncio, faker  

Worker 镜像（Ubuntu 24.04 示例 apt）：

`libreoffice-writer`, `libreoffice-calc`, `libreoffice-impress`, `ffmpeg`, `imagemagick`, `calibre`, `pandoc`, `poppler-utils`, `ghostscript`, `p7zip-full`, `libmagic1`

## 6. 风险缓解

| 风险 | 缓解 |
|------|------|
| LO 在容器无字体 | 安装 `fonts-noto-cjk` |
| IM 安全策略 | 自带 `policy.xml` 挂载 |
| 视频 CPU 占满 | heavy worker replicas + concurrency=1 |
| Windows 开发 | 仅编辑代码；集成测试靠 Docker |

## 7. 需求冲突记录

| # | 冲突 | 决议 |
|---|------|------|
| 1 | 任务书列全格式 vs 引擎现实 | 矩阵分 production/experimental；API 不返回未验证对 |
| 2 | RAR 闭源 | v1 ZIP/7Z/TAR 为主；RAR experimental |
| 3 | Aconvert 多编辑功能 vs v1 工期 | PRD 划 v2；v1 专注 Convert + PDF merge |
| 4 | 产品设计 bot vs 大量编码 | 文档在 M0；实现需本仓库继续或协调「编码部署」 |

## 8. 下一步（M1 第一天）

1. 在本工作区 `convert-platform/` 初始化 pyproject + docker-compose 占位  
2. 实现 models + `POST /batches` + upload  
3. FFmpegAdapter 或 ImageMagickAdapter 第一个 green 测试  

**修改记录**：2026-11-06 创建 docs 六件套；环境勘察 Windows/Python 无 Docker。
