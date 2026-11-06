import shutil
import time
from pathlib import Path

from PIL import Image

from app.adapters.base import (
    ConversionAdapter,
    ConversionContext,
    ConversionResult,
    FormatPair,
)

_PIL_FORMAT = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
    "gif": "GIF",
}


class PillowImageAdapter(ConversionAdapter):
    engine_id = "pillow"

    def supported_pairs(self) -> list[FormatPair]:
        fmts = ["png", "jpg", "jpeg", "webp", "gif"]
        pairs: list[FormatPair] = []
        for src in fmts:
            for tgt in fmts:
                if src == tgt or (src == "jpeg" and tgt == "jpg") or (src == "jpg" and tgt == "jpeg"):
                    continue
                pairs.append(FormatPair(source=src.replace("jpeg", "jpg"), target=tgt.replace("jpeg", "jpg")))
        # dedupe
        seen: set[tuple[str, str]] = set()
        unique: list[FormatPair] = []
        for p in pairs:
            key = (p.source, p.target)
            if key not in seen:
                seen.add(key)
                unique.append(p)
        return unique

    def convert(self, ctx: ConversionContext) -> ConversionResult:
        start = time.perf_counter()
        src = ctx.source_format.replace("jpeg", "jpg")
        tgt = ctx.target_format.replace("jpeg", "jpg")
        pil_out = _PIL_FORMAT.get(tgt)
        if not pil_out:
            return ConversionResult(
                success=False,
                error_code="UNSUPPORTED_PAIR",
                error_message=f"Pillow cannot write {tgt}",
            )
        work = ctx.work_dir
        work.mkdir(parents=True, exist_ok=True)
        local_in = work / f"in.{src}"
        local_out = work / f"out.{tgt if tgt != 'jpg' else 'jpg'}"
        shutil.copy2(ctx.input_path, local_in)
        try:
            with Image.open(local_in) as im:
                if pil_out == "JPEG" and im.mode in ("RGBA", "P"):
                    im = im.convert("RGB")
                quality = int(ctx.params.get("quality", 85))
                save_kw = {"quality": quality} if pil_out == "JPEG" else {}
                if pil_out == "WEBP":
                    save_kw["quality"] = quality
                im.save(local_out, format=pil_out, **save_kw)
        except OSError as e:
            return ConversionResult(
                success=False,
                error_code="CORRUPT_INPUT",
                error_message=str(e),
                duration_ms=int((time.perf_counter() - start) * 1000),
            )

        if not local_out.is_file() or local_out.stat().st_size == 0:
            return ConversionResult(
                success=False,
                error_code="ENGINE_ERROR",
                error_message="Empty output",
                duration_ms=int((time.perf_counter() - start) * 1000),
            )

        ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_out, ctx.output_path)
        return ConversionResult(
            success=True,
            output_path=ctx.output_path,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
