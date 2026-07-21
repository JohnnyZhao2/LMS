from types import SimpleNamespace

from apps.knowledge.previews import build_content_preview_html
from apps.knowledge.serializers import KnowledgeDetailSerializer, KnowledgeListSerializer


def test_content_preview_html_is_bounded_and_keeps_card_structure():
    content = (
        '<h1 class="title">项目概述</h1>'
        '<p>正文内容</p>'
        '<img src="data:image/png;base64,very-large-payload">'
        f'<ol><li>{"长内容" * 400}</li></ol>'
        '<script>window.alert("unsafe")</script>'
    )

    preview = build_content_preview_html(content, text_limit=40)

    assert preview.startswith('<h1>项目概述</h1><p>正文内容</p><ol><li>')
    assert preview.endswith('…</li></ol>')
    assert 'class=' not in preview
    assert '<img' not in preview
    assert 'base64' not in preview
    assert '<script' not in preview
    assert 'unsafe' not in preview


def test_content_preview_html_bounds_empty_structure_nodes():
    # One real character + many empty nodes must not produce full-size HTML.
    content = 'x' + ('<p><br></p>' * 5000)

    preview = build_content_preview_html(content, text_limit=600, node_limit=20)

    assert preview.startswith('x')
    assert '…' in preview
    assert preview.count('<p>') <= 20
    assert preview.count('<br>') <= 20
    assert len(preview) < 500


def test_list_payload_excludes_full_content_but_detail_keeps_it():
    knowledge = SimpleNamespace(
        id=1,
        title='列表响应契约',
        space_tag=None,
        content='<h1>完整正文</h1><p>详情内容</p>',
        content_preview_html='<h1>完整正文</h1><p>详情内容</p>',
        related_links=[],
        view_count=0,
        created_by=None,
        updated_by=None,
        created_at=None,
        updated_at=None,
        tags_json=[],
    )

    list_payload = KnowledgeListSerializer(knowledge).data
    detail_payload = KnowledgeDetailSerializer(knowledge).data

    assert 'content' not in list_payload
    assert list_payload['content_preview_html'] == '<h1>完整正文</h1><p>详情内容</p>'
    assert detail_payload['content'] == knowledge.content
    assert 'content_preview_html' not in detail_payload
