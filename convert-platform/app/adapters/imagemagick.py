import shutil
import subprocess
import time
from pathlib import Path

from app.adapters.base import (
    ConversionAdapter,
    ConversionContext,
    ConversionResult,
    FormatPair,
)
from app.adapters.pillow_image import PillowImageAdapter


def _find_magick() -> list[str] | None:
    for cmd in (["magick"], ["convert"]):
        exe = shutil.which(cmd[0])
        if exe:
            return [exe]
    return None


class ImageMagickAdapter(ConversionAdapter):
    engine_id = "imagemagick"

    def __init__(self) -> None:
        self._magick = _find_magick()
        self._fallback = PillowImageAdapter()

    def supported_pairs(self) -> list[FormatPair]:
        return self._fallback.supported_pairs()

    def healthcheck(self) -> bool:
        return self._magick is not None or self._fallback.healthcheck()

    def convert(self, ctx: ConversionContext) -> ConversionResult:
        if not self._magick:
            return self._fallback.convert(ctx)

        start = time.perf_counter()
        src = ctx.source_format.replace("jpeg", "jpg")
        tgt = ctx.target_format.replace("jpeg", "jpg")
        work = ctx.work_dir
        work.mkdir(parents=True, exist_ok=True)
        local_in = work / f"in.{src}"
        local_out = work / f"out.{tgt}"
        shutil.copy2(ctx.input_path, local_in)

        cmd = [*self._magick, str(local_in), str(local_out)]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=ctx.limits.timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return ConversionResult(
                success=False,
                error_code="TIMEOUT",
                error_message="ImageMagick timed out",
                duration_ms=int((time.perf_counter() - start) * 1000),
            )

        if proc.returncode != 0 or not local_out.is_file():
            return ConversionResult(
                success=False,
                error_code="ENGINE_ERROR",
                error_message=proc.stderr[:500] or "ImageMagick failed",
                engine_log=proc.stderr[:2000],
                duration_ms=int((time.perf_counter() - start) * 1000),
            )

        ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_out, ctx.output_path)
        return ConversionResult(
            success=True,
            output_path=ctx.output_path,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
