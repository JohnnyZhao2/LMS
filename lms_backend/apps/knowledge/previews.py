"""Knowledge card preview generation."""

from html import escape
from html.parser import HTMLParser


KNOWLEDGE_CARD_PREVIEW_TEXT_LIMIT = 600
# Bound structural size so empty tags (e.g. repeated <p><br></p>) cannot
# inflate list payloads when text_length stays low.
KNOWLEDGE_CARD_PREVIEW_NODE_LIMIT = 200

_ALLOWED_TAGS = frozenset({
    'a',
    'b',
    'blockquote',
    'code',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'i',
    'li',
    'ol',
    'p',
    'pre',
    'section',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
})
_VOID_TAGS = frozenset({'br', 'hr'})
_SKIPPED_CONTENT_TAGS = frozenset({
    'audio',
    'iframe',
    'object',
    'picture',
    'script',
    'style',
    'svg',
    'video',
})


class _KnowledgePreviewParser(HTMLParser):
    """Build a bounded, attribute-free HTML fragment for list cards."""

    def __init__(self, text_limit: int, node_limit: int):
        super().__init__(convert_charrefs=True)
        self.text_limit = text_limit
        self.node_limit = node_limit
        self.text_length = 0
        self.node_count = 0
        self.parts = []
        self.open_tags = []
        self.skipped_content_depth = 0
        self.truncated = False

    def handle_starttag(self, tag, attrs):
        normalized_tag = tag.lower()
        if normalized_tag in _SKIPPED_CONTENT_TAGS:
            self.skipped_content_depth += 1
            return
        if self.skipped_content_depth or self.truncated:
            return
        if normalized_tag in _VOID_TAGS:
            self._append_node(f'<{normalized_tag}>')
            return
        if normalized_tag in _ALLOWED_TAGS:
            if not self._append_node(f'<{normalized_tag}>'):
                return
            self.open_tags.append(normalized_tag)

    def handle_startendtag(self, tag, attrs):
        normalized_tag = tag.lower()
        if not self.skipped_content_depth and not self.truncated and normalized_tag in _VOID_TAGS:
            self._append_node(f'<{normalized_tag}>')

    def handle_endtag(self, tag):
        normalized_tag = tag.lower()
        if normalized_tag in _SKIPPED_CONTENT_TAGS:
            if self.skipped_content_depth:
                self.skipped_content_depth -= 1
            return
        if self.skipped_content_depth or self.truncated or normalized_tag not in self.open_tags:
            return
        while self.open_tags:
            open_tag = self.open_tags.pop()
            self.parts.append(f'</{open_tag}>')
            if open_tag == normalized_tag:
                break

    def handle_data(self, data):
        if self.skipped_content_depth or self.truncated or not data:
            return
        remaining = self.text_limit - self.text_length
        if remaining <= 0:
            self._mark_truncated()
            return
        if len(data) <= remaining:
            self.parts.append(escape(data))
            self.text_length += len(data)
            return
        self.parts.append(escape(data[:remaining].rstrip()))
        self.text_length = self.text_limit
        self._mark_truncated()

    def _append_node(self, markup: str) -> bool:
        if self.node_count >= self.node_limit:
            self._mark_truncated()
            return False
        self.parts.append(markup)
        self.node_count += 1
        return True

    def _mark_truncated(self):
        if self.truncated:
            return
        self.parts.append('…')
        self.truncated = True

    def build(self) -> str:
        self.close()
        while self.open_tags:
            self.parts.append(f'</{self.open_tags.pop()}>')
        return ''.join(self.parts)


def build_content_preview_html(
    content: str,
    text_limit: int = KNOWLEDGE_CARD_PREVIEW_TEXT_LIMIT,
    node_limit: int = KNOWLEDGE_CARD_PREVIEW_NODE_LIMIT,
) -> str:
    parser = _KnowledgePreviewParser(
        text_limit=max(1, text_limit),
        node_limit=max(1, node_limit),
    )
    parser.feed(content or '')
    return parser.build()
