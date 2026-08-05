"""文档链接 ID 提取测试。"""

from apps.knowledge.doc_url import extract_doc_id


def test_extract_doc_id():
    assert extract_doc_id('https://xx.feishu.cn/wiki/v?id=abc&mode=edit') == 'abc'
    assert extract_doc_id('https://xx.feishu.cn/wiki/v?id=abc') == 'abc'
    assert extract_doc_id('') is None
    assert extract_doc_id('https://xx.feishu.cn/wiki/v') is None
