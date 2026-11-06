from dataclasses import dataclass

SIGNATURES: list[tuple[bytes, str, str]] = [
    (b"\x89PNG\r\n\x1a\n", "png", "image/png"),
    (b"\xff\xd8\xff", "jpg", "image/jpeg"),
    (b"GIF87a", "gif", "image/gif"),
    (b"GIF89a", "gif", "image/gif"),
    (b"RIFF", "webp", "image/webp"),  # needs WEBP at 8:12
    (b"%PDF", "pdf", "application/pdf"),
]


@dataclass
class DetectedType:
    format_id: str
    mime_type: str
    confidence: str  # magic | extension


def _webp_check(header: bytes) -> bool:
    return len(header) >= 12 and header[8:12] == b"WEBP"


def detect_file_type(header: bytes, filename: str) -> DetectedType | None:
    for sig, fmt, mime in SIGNATURES:
        if fmt == "webp":
            if header.startswith(sig) and _webp_check(header):
                return DetectedType(fmt, mime, "magic")
            continue
        if header.startswith(sig):
            return DetectedType(fmt, mime, "magic")

    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    ext_map = {
        "png": ("png", "image/png"),
        "jpg": ("jpg", "image/jpeg"),
        "jpeg": ("jpg", "image/jpeg"),
        "gif": ("gif", "image/gif"),
        "webp": ("webp", "image/webp"),
        "pdf": ("pdf", "application/pdf"),
    }
    if ext in ext_map:
        fmt, mime = ext_map[ext]
        return DetectedType(fmt, mime, "extension")
    return None
