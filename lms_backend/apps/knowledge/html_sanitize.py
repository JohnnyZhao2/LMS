"""步骤摘要 HTML 清洗：仅保留裸 br / strong（剥掉全部属性，防 XSS）。"""

import re


def sanitize_steps_html(html: str) -> str:
    """清洗步骤摘要，仅保留裸 br / strong。"""
    text = html or ''
    text = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</p>', '<br>', text, flags=re.IGNORECASE)
    text = re.sub(r'<p[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<div[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</div>', '<br>', text, flags=re.IGNORECASE)
    text = re.sub(r'<(?!/?(?:br|strong|b)\b)[^>]+>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<br\b[^>]*>', '<br>', text, flags=re.IGNORECASE)
    text = re.sub(r'<(?:strong|b)\b[^>]*>', '<strong>', text, flags=re.IGNORECASE)
    text = re.sub(r'</(?:strong|b)>', '</strong>', text, flags=re.IGNORECASE)
    text = re.sub(r'(?:<br\s*/?\s*>\s*)+$', '', text, flags=re.IGNORECASE)
    return text.strip()


def build_content_preview(content: str, max_chars: int = 500) -> str:
    """列表预览：轻量 HTML；超长硬截断后再洗一次（视觉截断交给前端 line-clamp）。"""
    html = sanitize_steps_html(content)
    if len(html) <= max_chars:
        return html
    return sanitize_steps_html(html[:max_chars])
