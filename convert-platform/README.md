# convert-platform

批量文件转换后端（M1：图片转换端到端）。

## 本地开发（Windows / 无 Docker）

```powershell
cd convert-platform
pip install -e ".[dev]"
$env:CELERY_TASK_ALWAYS_EAGER = "true"
uvicorn app.main:app --reload --port 8000
```

另开终端跑 worker（非 eager 时）：

```powershell
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

## 测试

```powershell
.\scripts\run-tests.ps1
```

## Docker Compose

需已安装 Docker Desktop：

```bash
docker compose up --build
```

## API 示例

```bash
curl -X POST http://localhost:8000/v1/batches -H "Content-Type: application/json" -d "{}"
curl -X POST "http://localhost:8000/v1/batches/{batch_id}/files" \
  -F "files=@sample.png" -F 'targets=["jpg"]'
curl http://localhost:8000/v1/batches/{batch_id}
curl -OJ http://localhost:8000/v1/files/{file_id}/download
```

OpenAPI：http://localhost:8000/docs

## M1 范围

- Batch / File 状态机
- 多文件上传、魔数检测
- Celery 队列（测试 eager 同步）
- ImageMagick 适配器（无 magick 时用 Pillow 真实转换栅格图）
- png → jpg 自动化测试
