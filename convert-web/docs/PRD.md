# PRD：全格式批量文件转换平台

**版本**：0.1（开发前基线）  
**参考产品**：[Aconvert.com](https://www.aconvert.com)  
**文档日期**：2026-11-06  

## 1. 背景与目标

构建一套**可本地部署、真实执行转换**的后端平台：支持多文件上传、混合格式批量任务、异步队列、逐文件进度与错误、结果下载与过期清理。前端可独立开发，通过 REST API 集成。

**非目标（v1）**

- 复刻 Aconvert 全部编辑类功能（PDF 加锁、图片裁剪、视频剪切等）—— v1 以 **Convert** 为主，编辑/工具类功能列入 v2  backlog。
- 宣称未经验证引擎测试的格式组合。
- 无引擎支撑的「伪成功」响应。

## 2. 用户与场景

| 角色 | 场景 |
|------|------|
| 终端用户（经前端） | 一次选多个文件，分别指定目标格式，等待完成后单个或 ZIP 下载 |
| 集成方 | 通过 API 提交 batch job，轮询或 webhook（可选 v1.1）获取状态 |
| 运维 | Docker Compose 一键起服务，监控队列深度与磁盘 |

## 3. 参考站点功能拆解（Aconvert）

基于站点 Formats 页与首页交互（2026-11-06 浏览）：

| 大类 | 站点列出的能力 | 目标格式（与任务书对齐） |
|------|----------------|---------------------------|
| PDF | Convert, Split, Merge, Compress, Lock, Unlock, Extract, Rotate | PDF 及常用互转 |
| Document | Convert, Edit, OCR, Case, Base64 | DOC/DOCX/XLS/XLSX/PPT/PPTX/HTML/TXT/CSV/RTF/ODT/ODS/ODP/XPS/OXPS |
| Ebook | Convert | AZW3/DJVU/EPUB/FB2/OEB/LIT/LRF/MOBI/PDB/RB/SNB/TCR |
| Image | Convert, Compress, Resize, Crop, Merge, Rotate, Edit | JPG/PNG/WEBP/GIF/HEIC/SVG/BMP/PS/PSD/TGA/DDS/JXR/J2K/PNM/XWD/AVIF |
| Icon | Convert | ICO |
| Video | Convert, Cut, Merge, Compress, Extract, Rotate, Crop, Pad | MP4/AVI/FLV/MPG/MKV/WMV/M2TS/WEBM/ASF/MOV/M4V/RM/VOB/OGV |
| Audio | Convert, Cut, Merge, Compress, Extract | WAV/WMA/MP3/OGG/AAC/AU/FLAC/M4A/MKA/AIFF/OPUS/RA |
| Archive | Convert | 7Z/TAR/RAR/ZIP/WIM |
| Webpage | （导航存在） | v1 不做 URL 抓取转换 |

**v1 产品范围**：上表每类的 **Convert**；PDF 额外支持 **Merge**（多 PDF→单 PDF）若引擎就绪。**OCR / 编辑 / 剪切** 列为 v2。

## 4. 功能需求

### 4.1 上传

- 单次请求多文件（multipart）。
- 混合格式；单文件独立元数据（可选目标格式）。
- 服务端：魔数 + MIME + 扩展名交叉校验；大小上限（可配置，默认如 200MB/文件）。
- 安全文件名（去路径、Unicode 规范化、拒绝 `..`）。
- 单文件失败不影响同批其他文件入库。

### 4.2 格式与转换

- 根据检测到的源类型返回**已注册**的目标格式列表（来自 Format Capability Registry，非静态 JSON）。
- 用户指定 `target_format`；可选引擎参数（如 PDF DPI、视频 CRF、图片 quality）。
- 一文件一 Job；批任务 Batch 仅作聚合查询与 ZIP 下载。

### 4.3 任务状态

单文件状态机：

`PENDING` → `UPLOADING`（可选，若分步上传）→ `QUEUED` → `PROCESSING` → `SUCCESS` | `FAILED` | `CANCELLED`

批任务 `Batch`：`aggregated_status`（全部成功 / 部分失败 / 进行中）。

### 4.4 失败与重试

- 分类：`TIMEOUT`, `ENGINE_UNAVAILABLE`, `CORRUPT_INPUT`, `UNSUPPORTED_PAIR`, `DISK_FULL`, `RESOURCE_LIMIT`, `INTERNAL`.
- 可重试：超时、引擎暂时不可用、资源不足（退避重试，默认 max 3）。
- 不可重试：不支持组合、损坏文件、安全拒绝。
- 持久化 `error_code` + `error_message`（对用户友好）+ `engine_stderr`（运维，可选截断）。

### 4.5 结果

- 单文件下载（短期 signed URL 或直接流式，v1 可简化为 token + path）。
- 批 ZIP 下载（仅 SUCCESS 项，或含失败清单 manifest.json）。
- 重试失败项、删除 batch、取消排队中任务。
- 默认 **1 小时** TTL 后 Cleanup Worker 删对象与 DB 记录（可配置）。

### 4.6 安全（必须）

- 不执行宏/脚本；Office 转换使用无界面 headless，禁用宏。
- 子进程：固定 argv，无 shell；工作目录 chroot 式隔离（独立 temp 子目录）。
- 资源：cgroup/ulimit 或 worker 级 timeout + 内存监控（Docker 内更易做）。
- ZIP：解压前检查压缩比（zip bomb）、条目数、解压后总大小上限。
- 引擎进程默认无出站网络（Docker network=none 或防火墙）。

## 5. 非功能需求

| 项 | v1 目标 |
|----|---------|
| 吞吐 | 水平扩展 worker 副本（同 Redis 队列） |
| 可用性 | API 与 worker 分离；引擎崩溃不拖垮 API |
| 可观测 | 结构化日志；job_id 全链路 |
| 部署 | `docker compose up` + `pytest` 一条命令测试（见 DEVELOPMENT_PLAN） |

## 6. 验收标准（后端）

1. 文档六件套齐全且与实现一致（随迭代更新 FORMAT_MATRIX）。
2. 至少覆盖：**Document（docx→pdf）**、**Image（png→webp）**、**Audio（wav→mp3）**、**Video（mp4→webm 或 mp3 extract）**、**Archive（zip↔tar）**、**Ebook（epub→mobi）** 各一条真实转换自动化测试。
3. 批量 3 文件混合类型，1 故意损坏 → 2 成功 1 失败，批状态正确。
4. 安全用例：伪造扩展名、zip bomb 样本拒绝。
5. 过期清理测试：TTL 后文件不可下载且记录删除。

## 7. 风险与依赖

- **RAR 读**：需 unrar 非自由组件或许可限制 → v1 可仅支持 ZIP/7Z/TAR 互转，RAR 只读或延后。
- **HEIC/AVIF**：依赖 libheif / libavif 与 ImageMagick 编译选项。
- **DJVU/LIT 等冷门电子书**：Calibre 支持不一 → 矩阵标 `experimental` 或 v2。
- **Windows 宿主**：转换引擎建议在 **Linux 容器** 内运行；当前开发机未检测到 Docker，需安装 Docker Desktop 或 WSL2 后再跑 Compose。

## 8. 里程碑

| 阶段 | 交付 |
|------|------|
| M0 | 本文档 + ARCHITECTURE + API_SPEC + ENGINE_ADAPTERS + FORMAT_MATRIX + DEVELOPMENT_PLAN |
| M1 | 骨架：上传、队列、单引擎（如 FFmpeg 或 ImageMagick）端到端 |
| M2 | 全引擎接入 + 能力注册 + 矩阵测试 |
| M3 | 安全、清理、ZIP 批下、验收报告 |
