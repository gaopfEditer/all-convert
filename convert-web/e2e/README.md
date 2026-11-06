# E2E 测试

## 运行

1. 启动后端（Celery eager 或 worker 均可，需能完成图片转换）。
2. `npm run test:e2e`

环境变量：

- `E2E_API_URL` — 默认 `http://127.0.0.1:8000`
- `E2E_WEB_URL` — 默认 `http://127.0.0.1:5173`
- `E2E_SKIP_WEB=1` — 不自动起 Vite（已手动 dev 时）

## 覆盖场景（任务书）

| # | 场景 |  spec / 状态 |
|---|------|----------------|
| 1 | DOCX→PDF | 待样本文件 + LO 引擎 |
| 2 | 多图→WEBP | `convert-flow.spec.ts`（单 PNG） |
| 3–10 | 视频/音频/混合/ZIP/失败/损坏/刷新 | 需后端端点与引擎就绪后扩展 |

完整清单见 `docs/INTEGRATION_TEST_REPORT.md`。
