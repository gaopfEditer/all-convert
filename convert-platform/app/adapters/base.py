from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal


@dataclass
class FormatPair:
    source: str
    target: str
    status: Literal["production", "experimental"] = "production"


@dataclass
class ConversionLimits:
    timeout_seconds: int = 120
    max_output_bytes: int = 500 * 1024 * 1024


@dataclass
class ConversionContext:
    job_id: str
    input_path: Path
    output_path: Path
    source_format: str
    target_format: str
    params: dict[str, Any] = field(default_factory=dict)
    limits: ConversionLimits = field(default_factory=ConversionLimits)
    work_dir: Path = field(default_factory=Path)


@dataclass
class ConversionResult:
    success: bool
    output_path: Path | None = None
    error_code: str | None = None
    error_message: str | None = None
    engine_log: str | None = None
    duration_ms: int = 0


class ConversionAdapter:
    engine_id: str = "base"

    def supported_pairs(self) -> list[FormatPair]:
        raise NotImplementedError

    def convert(self, ctx: ConversionContext) -> ConversionResult:
        raise NotImplementedError

    def healthcheck(self) -> bool:
        return True
