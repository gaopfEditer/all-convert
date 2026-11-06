import re
import unicodedata
from pathlib import PurePath


_UNSAFE = re.compile(r"[^\w.\- ]", re.UNICODE)


def safe_filename(name: str) -> str:
    normalized = unicodedata.normalize("NFKC", name or "file")
    base = PurePath(normalized).name
    if base in ("", ".", ".."):
        return "file"
    cleaned = _UNSAFE.sub("_", base).strip(" .")
    return cleaned[:200] if cleaned else "file"
