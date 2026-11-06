# convert-web

Aconvert 风格全格式批量转换平台 **前端**（Vite + React + TypeScript + Tailwind）。

## 前置

1. 启动后端 `convert-platform`（默认 `http://127.0.0.1:8000`，前缀 `/v1`）。
2. Node.js 18+。

## 开发

```bash
cd convert-web
npm install
npm run dev
```

浏览器打开 Vite 地址（默认 5173）。`/v1` 通过 Vite 代理到后端，无需 CORS。

可选环境变量（`.env`）：

```env
VITE_API_BASE_URL=
VITE_PROXY_TARGET=http://127.0.0.1:8000
```

生产构建若前后端不同域，设置 `VITE_API_BASE_URL` 为 API 根地址，并确保后端启用 CORS 或网关反代。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建 |
| `npm run test:e2e` | Playwright E2E（需真实后端） |

## 组件结构

- `FileUploader` — 拖拽/多选上传
- `FileList` — 本地队列 + 服务端文件状态
- `FormatSelector` — 按源格式拉取 `/formats/{source}/targets`
- `ConversionSettings` — 参数 UI（待 PATCH API）
- `ConversionProgress` — 批次阶段统计
- `ConversionResult` / `BatchActions` — 下载与 ZIP

契约文档：`docs/API_SPEC.md`、`docs/BACKEND_GAPS.md`。

## E2E

见 `e2e/README.md` 与 `docs/INTEGRATION_TEST_REPORT.md`（运行后生成/更新）。
