"""招乎/飞书文档链接工具。"""

from typing import Optional
from urllib.parse import parse_qs, urlparse


def extract_doc_id(url: str) -> Optional[str]:
    """从文档链接 query.id 提取文档 ID。"""
    raw = (url or '').strip()
    if not raw:
        return None
    values = parse_qs(urlparse(raw).query).get('id') or []
    doc_id = (values[0] if values else '').strip()
    return doc_id or None


def normalize_doc_key(url: str) -> Optional[str]:
    """提取用于关联同文档的归一化标识：优先 `id:<doc_id>`，否则为去除 fragment 后的 URL。"""
    raw = (url or '').strip()
    if not raw:
        return None
    doc_id = extract_doc_id(raw)
    if doc_id:
        return f'id:{doc_id}'
    return raw.split('#', 1)[0].strip() or None
