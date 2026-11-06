from app.adapters.base import ConversionAdapter, FormatPair
from app.adapters.imagemagick import ImageMagickAdapter

_adapters: dict[str, ConversionAdapter] = {}
_pair_index: dict[tuple[str, str], str] = {}


def _norm(fmt: str) -> str:
    f = fmt.lower().strip()
    return "jpg" if f == "jpeg" else f


def init_registry() -> None:
    global _adapters, _pair_index
    if _adapters:
        return
    primary = ImageMagickAdapter()
    _adapters[primary.engine_id] = primary
    _pair_index = {}
    for pair in primary.supported_pairs():
        if pair.status != "production":
            continue
        key = (_norm(pair.source), _norm(pair.target))
        _pair_index[key] = primary.engine_id


def get_adapter(engine_id: str) -> ConversionAdapter:
    init_registry()
    return _adapters[engine_id]


def resolve_engine(source: str, target: str) -> ConversionAdapter | None:
    init_registry()
    eid = _pair_index.get((_norm(source), _norm(target)))
    if not eid:
        return None
    return _adapters[eid]


def list_capabilities(include_experimental: bool = False) -> list[FormatPair]:
    init_registry()
    adapter = next(iter(_adapters.values()))
    pairs = adapter.supported_pairs()
    if include_experimental:
        return pairs
    return [p for p in pairs if p.status == "production"]


def list_source_formats() -> list[str]:
    fmts: set[str] = set()
    for p in list_capabilities():
        fmts.add(_norm(p.source))
    return sorted(fmts)
