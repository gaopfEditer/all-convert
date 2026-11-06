# 转换引擎适配器设计

## 1. 设计原则

1. **统一接口**：业务与 Celery task 只调用 `AdapterRegistry.get(engine_id).convert(ctx)`。
2. **真实执行**：`ConversionResult.success` 必须对应磁盘上存在且魔数校验通过的输出。
3. **无 shell**：使用 `subprocess.run([...], shell=False)`，参数白名单。
4. **隔离**：每 job 目录 `work/{job_id}/in|out`，结束后 `shutil.rmtree`。
5. **能力诚实**：`supported_pairs()` 与集成测试一致；运行时若引擎返回非 0，映射为 FAILED 而非 SUCCESS。

## 2. 核心类型（Python 示意）

```python
@dataclass
class FormatPair:
    source: str   # lowercase ext id, e.g. "docx"
    target: str
    status: Literal["production", "experimental"]

@dataclass
class ConversionLimits:
    timeout_seconds: int
    max_output_bytes: int
    max_memory_mb: int | None = None

@dataclass
class ConversionContext:
    job_id: str
    input_path: Path
    output_path: Path
    source_format: str
    target_format: str
    params: dict[str, Any]
    limits: ConversionLimits
    work_dir: Path

@dataclass
class ConversionResult:
    success: bool
    output_path: Path | None
    error_code: str | None
    error_message: str | None
    engine_log: str | None  # truncated stderr
    duration_ms: int
```

## 3. 适配器清单

| engine_id | 二进制 | 适配器类 | 备注 |
|-----------|--------|----------|------|
| libreoffice | `soffice` | LibreOfficeAdapter | `--headless --convert-to` |
| pandoc | `pandoc` | PandocAdapter | 文档/HTML |
| calibre | `ebook-convert` | CalibreAdapter | 电子书 |
| ffmpeg | `ffmpeg`, `ffprobe` | FFmpegAdapter | 音视频 |
| imagemagick | `magick` / `convert` | ImageMagickAdapter | IM7 优先 |
| libvips | `vips` | VipsAdapter | 可选，大图性能 |
| poppler | `pdftoppm`, `pdfunite` | PopplerAdapter | PDF 栅格/合并 |
| ghostscript | `gs` | GhostscriptAdapter | PDF 压缩/转图 |
| archive_7z | `7z` | SevenZipAdapter | 归档互转 |
| wimlib | `wimextract` | WimlibAdapter | planned |

## 4. 路由策略

`JobRouter` 根据 `(source, target)` 查 `capabilities` 表：

1. 唯一 production 引擎 → 直接指派。
2. 多个 → 按优先级（质量/速度配置）或 round-robin。
3. 无匹配 → 创建 job 前拒绝 `UNSUPPORTED_PAIR`。
4. experimental → 仅 `include_experimental=true` 的 batch 或 admin flag。

## 5. 各适配器要点

### LibreOfficeAdapter

- 输入/输出复制到 work_dir，避免路径注入。
- 支持：doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp, rtf, html → pdf/odt/…
- 超时：120s 默认；失败码映射 `CORRUPT_INPUT` vs `ENGINE_ERROR`。
- **安全**：禁用宏；不运行文档内嵌对象。

### FFmpegAdapter

- 先 `ffprobe` 验证流；再构造 argv（codec 映射表）。
- 视频队列 `convert.heavy`；`timeout` 600s+。
- 输出后 ffprobe 验证容器。

### ImageMagickAdapter

- 读入前 `policy.xml` 限制 memory、禁用 MVG/URL delegate（防 SSRF）。
- SVG 优先 `rsvg-convert` 或 IM 带 delegate 检查。
- HEIC/AVIF：检测 `magick -list format` 是否含 HEIC/AVIF。

### CalibreAdapter

- `ebook-convert in.epub out.mobi`；大文件 timeout 300s。
- 不支持组合返回明确 stderr 解析。

### SevenZipAdapter

- 「转换」= extract 到 temp → create 目标格式。
- 解压前：总大小预检、文件数上限（zip bomb）。
- RAR：若仅 `7z x` 只读，输出仍可为 zip；矩阵标 experimental。

### Poppler / Ghostscript

- PDF merge：`pdfunite`。
- PDF → png：`pdftoppm -png`。
- 压缩：GS `pdfwrite` 参数集。

## 6. 健康检查

启动与每 5 分钟：

```text
soffice --version
ffmpeg -version
magick -version
ebook-convert --version
7z
```

失败 → 引擎标记 `down`，路由跳过；API `/health/engines` 暴露。

## 7. 错误映射

| 引擎现象 | error_code | retryable |
|----------|------------|-----------|
| timeout | TIMEOUT | true |
| exit 1 + corrupt | CORRUPT_INPUT | false |
| unsupported codec | UNSUPPORTED_PAIR | false |
| OOM killed | RESOURCE_LIMIT | true |
| 磁盘写失败 | DISK_FULL | false |

## 8. 测试钩子

每个适配器：

- `tests/engines/test_<engine>_smoke.py`：最小样本 roundtrip。
- 伪造损坏文件 → 必须 FAILED。
- 记录 golden stderr 长度上限，防日志撑爆 DB。

## 9. 扩展新引擎

1. 实现 `ConversionAdapter` 子类。
2. 注册到 `AdapterRegistry`。
3. 添加 Dockerfile 依赖层。
4. 增加 FORMAT_MATRIX 行 + 样本文件于 `tests/fixtures/`。
5. 跑 matrix job 更新 `capabilities.last_verified_at`。
