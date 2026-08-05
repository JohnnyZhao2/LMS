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
