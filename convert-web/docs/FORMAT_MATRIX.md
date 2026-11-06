# 格式能力矩阵（规划基线）

**说明**：下表为 **目标清单 + 引擎理论能力** 的交叉规划，**不是** v1 上线承诺。  
状态定义：

- **production**：集成测试通过，API 可返回
- **experimental**：引擎可能支持，需样本验证
- **planned**：已选引擎，未实现
- **unsupported**：无可靠开源路径或许可/安全限制

能力边 **有向**：仅列出常见源→目标；全互转不成立。

## 1. 引擎分工（摘要）

| 引擎 | 主责类别 |
|------|----------|
| LibreOffice (soffice) | Document, 部分 PDF 导出 |
| Pandoc | HTML/Markdown/TXT/部分 DOCX 互转 |
| Poppler (pdftoppm, pdfunite) + Ghostscript | PDF↔图、PDF 合并压缩 |
| Calibre (ebook-convert) | Ebook |
| FFmpeg | Video, Audio, 部分提取 |
| ImageMagick / libvips | Image, Icon(ICO) |
| libheif / libavif（可选） | HEIC, AVIF |
| 7-Zip / p7zip | 7Z, ZIP, TAR；WIM 需 wimlib |
| unrar（非自由） | RAR 只读解压 → 再打包 |

## 2. Document

| 源 \ 目标 | PDF | DOCX | HTML | TXT | CSV | ODT | XPS |
|-----------|-----|------|------|-----|-----|-----|-----|
| DOC/DOCX | production (LO) | — | experimental (Pandoc) | production | planned | production (LO) | planned |
| XLS/XLSX | production (LO) | planned | planned | experimental | production | production (LO) | planned |
| PPT/PPTX | production (LO) | planned | planned | planned | — | planned | planned |
| HTML | production (LO/Pdf) | experimental | — | production | — | planned | — |
| ODT/ODS/ODP | production (LO) | planned | planned | planned | planned | — | planned |
| XPS/OXPS | experimental (LO/GS) | planned | planned | planned | — | planned | — |

**注**：CSV/RTF 多经 LO 或 Pandoc；复杂 PPT 动画不保证保真。

## 3. PDF

| 操作 | 引擎 | 状态 |
|------|------|------|
| PDF → DOCX/TXT | pdftotext / LO 导入 | experimental |
| PDF → JPG/PNG | pdftoppm / GS | production |
| 多 PDF Merge | pdfunite / GS | production |
| Office → PDF | LO | production |
| Image → PDF | IM/GS | production |
| Split/Compress/Lock | qpdf, GS | planned (v2) |

## 4. Ebook

| 源 \ 目标 | EPUB | MOBI/AZW3 | PDF | TXT |
|-----------|------|-----------|-----|-----|
| EPUB | — | production (Calibre) | production | production |
| MOBI/AZW3 | production | — | production | production |
| FB2 | production | production | production | production |
| DJVU | experimental | experimental | experimental | experimental |
| LIT/LRF/OEB/RB/SNB/TCR/PDB | experimental | experimental | planned | experimental |

冷门格式仅在有样本测试后升为 production。

## 5. Image & Icon

| 源 \ 目标 | JPG | PNG | WEBP | GIF | AVIF | HEIC | SVG | ICO | PSD |
|-----------|-----|-----|------|-----|------|------|-----|-----|-----|
| JPG/PNG/WEBP/GIF/BMP | production (IM/vips) | production | production | production | experimental | experimental | — | production | planned |
| HEIC | experimental | experimental | experimental | — | experimental | — | — | planned | — |
| SVG | production (rsvg/IM) | production | production | — | planned | — | — | production | — |
| PSD/TGA/DDS/JXR/J2K/PNM/XWD | experimental | experimental | experimental | planned | planned | — | planned | planned | — |
| 任意 raster → ICO | — | — | — | — | — | — | — | production | — |

## 6. Video

| 源 \ 目标 | MP4(H.264) | WEBM | MKV | AVI | MOV | 提取 MP3 |
|-----------|------------|------|-----|-----|-----|----------|
| MP4/MOV/MKV/… | production (FFmpeg) | production | production | production | production | production |
| WMV/FLV/RM/VOB/OGV/M2TS | production | production | production | experimental | experimental | production |

RM/VOB 等依赖 FFmpeg 编译 demuxer；失败则标 experimental。

## 7. Audio

| 源 \ 目标 | MP3 | AAC/M4A | FLAC | WAV | OGG/OPUS | WMA |
|-----------|-----|---------|------|-----|----------|-----|
| WAV/FLAC/MP3/M4A/OGG | production | production | production | production | production | experimental |
| WMA/RA/AU/MKA/AIFF | experimental | experimental | production | production | experimental | — |

## 8. Archive

| 源 \ 目标 | ZIP | TAR | 7Z | WIM |
|-----------|-----|-----|----|-----|
| ZIP | — | production (7z) | production | planned |
| TAR/TAR.GZ | production | — | production | planned |
| 7Z | production | production | — | planned |
| RAR | experimental（解压 only） | experimental | experimental | unsupported |
| WIM | planned (wimlib) | planned | planned | — |

**Convert** 语义：解包 → 按目标格式重打包（非「RAR 直接变 ZIP」除非先解压）。

## 9. 注册与 API 行为

1. 启动时各 Adapter 上报 `supported_pairs()`。
2. 与 DB `capabilities` 合并；以 **测试套件 green 列表** 为准启用 production。
3. `GET /v1/formats/{source}/targets` 只返回 production（`?include=experimental` 给管理员）。
4. 每次引擎升级跑 **matrix regression**，更新 `last_verified_at`。

## 10. v1 最小可发布子集（建议 M1–M2）

优先打通：

- DOCX → PDF  
- PNG → WEBP, JPG → PNG  
- WAV → MP3  
- MP4 → WEBM 或 MP3 extract  
- EPUB → MOBI  
- ZIP ↔ TAR.GZ  

其余保持 planned/experimental 直至有测试样本。
