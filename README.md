# all-convert

全格式批量转换平台 monorepo（Aconvert 风格）。

| 目录 | 说明 |
|------|------|
| `convert-platform/` | FastAPI 后端，API 前缀 `/v1`，默认端口 **8000** |
| `convert-web/` | Vite + React 前端，开发端口 **5173** |

## 本地联调

**后端**（Windows，同步转换，无需单独 Celery）：

```powershell
cd convert-platform
pip install -e ".[dev]"
$env:CELERY_TASK_ALWAYS_EAGER = "true"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**前端**：

```powershell
cd convert-web
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173/ 。开发模式下 `/v1` 由 Vite 代理到 `http://127.0.0.1:8000`。

生产构建若前后端不同域，在 `convert-web` 设置 `VITE_API_BASE_URL` 并为 API 配置 CORS 或同域反代。

## 文档

- 前端：`convert-web/docs/API_SPEC.md`、`convert-web/docs/BACKEND_GAPS.md`
- 后端：`convert-platform/README.md`
