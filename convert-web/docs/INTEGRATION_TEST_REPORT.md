# 集成测试报告

**日期**：2026-11-06  
**前端**：convert-web  
**后端**：convert-platform（产品设计线程）

## 执行方式

```powershell
cd convert-web
npm run build
npm run test:e2e
```

后端需监听 `127.0.0.1:8000`；无后端时 smoke 仍可通过 UI 用例，集成用例自动 skip。

## 结果摘要

| 用例 | 结果 | 备注 |
|------|------|------|
| 首页上传区渲染 | 待本地执行 | `e2e/smoke.spec.ts` |
| API /v1/health | 待本地执行 | 依赖后端 |
| PNG→WEBP 全流程 | 待本地执行 | `e2e/convert-flow.spec.ts` |
| DOCX→PDF | 未实现 | 需 LibreOffice worker |
| 多图 WEBP 批量 | 未实现 | 可复用 flow spec 扩展 |
| MP4→WEBM | 未实现 | 需 ffmpeg worker |
| WAV→MP3 | 未实现 | 需 ffmpeg worker |
| 混合格式批次 | 未实现 | |
| ZIP 批量下载 | 阻塞 | 后端无 download.zip |
| 单文件失败隔离 | 未实现 | |
| 不支持/损坏文件 | 未实现 | |
| 刷新恢复批次 | 部分 | URL `?batch=` + localStorage 最近批次 |

## 结论

前端已对接现有 REST 端点，E2E 框架就绪；**完整任务书 10 项集成需后端补齐端点并启动转换引擎后**在本目录重跑 `npm run test:e2e` 并更新上表。
