"""
文档解析功能集成测试
测试覆盖：
- DocumentParserService 服务层测试
- ParseDocumentView API 测试
- 支持的文件格式：.docx, .pptx, .pdf
"""
import io
import pytest
from unittest.mock import MagicMock, patch
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.knowledge.services import DocumentParserService
from apps.users.models import Department, User


@pytest.fixture
def department():
    return Department.objects.create(name='测试部门', code='TEST')


@pytest.fixture
def user(department):
    return User.objects.create_user(
        employee_id='EMP001',
        username='测试用户',
        password='password123',
        department=department,
    )


@pytest.fixture
def parser_service():
    return DocumentParserService()


# ============================================
# DocumentParserService 单元测试
# ============================================

class TestDocumentParserService:
    """DocumentParserService 服务测试"""

    def test_supported_extensions(self, parser_service):
        """测试支持的文件扩展名"""
        assert '.docx' in parser_service.SUPPORTED_EXTENSIONS
        assert '.pptx' in parser_service.SUPPORTED_EXTENSIONS
        assert '.pdf' in parser_service.SUPPORTED_EXTENSIONS
        assert '.txt' not in parser_service.SUPPORTED_EXTENSIONS

    def test_max_file_size(self, parser_service):
        """测试最大文件大小限制"""
        assert parser_service.MAX_FILE_SIZE == 10 * 1024 * 1024  # 10MB

    def test_unsupported_file_format(self, parser_service):
        """测试不支持的文件格式"""
        file = SimpleUploadedFile(
            name='test.txt',
            content=b'test content',
            content_type='text/plain'
        )
        with pytest.raises(ValueError) as exc_info:
            parser_service.parse(file)
        assert '不支持的文件格式' in str(exc_info.value)

    def test_file_size_exceeds_limit(self, parser_service):
        """测试文件大小超过限制"""
        # 创建一个超过 10MB 的模拟文件
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        file = SimpleUploadedFile(
            name='large.docx',
            content=large_content,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        with pytest.raises(ValueError) as exc_info:
            parser_service.parse(file)
        assert '文件大小超过限制' in str(exc_info.value)

    def test_extract_title_from_filename(self, parser_service):
        """测试从文件名提取标题"""
        assert parser_service._extract_title_from_filename('测试文档.docx') == '测试文档'
        assert parser_service._extract_title_from_filename('report.pdf') == 'report'
        # 只有扩展名的文件名，splitext 会把整个当作文件名
        assert parser_service._extract_title_from_filename('.docx') == '.docx'
        # 空文件名返回未命名文档
        assert parser_service._extract_title_from_filename('') == '未命名文档'

    def test_merge_consecutive_lists(self, parser_service):
        """测试合并连续列表项"""
        html = '<ul><li>item1</li></ul><ul><li>item2</li></ul>'
        result = parser_service._merge_consecutive_lists(html)
        assert result == '<ul><li>item1</li><li>item2</li></ul>'

        html_ol = '<ol><li>item1</li></ol><ol><li>item2</li></ol>'
        result_ol = parser_service._merge_consecutive_lists(html_ol)
        assert result_ol == '<ol><li>item1</li><li>item2</li></ol>'


class TestDocxParser:
    """Word 文档解析测试"""

    def test_parse_docx_with_heading(self, parser_service):
        """测试解析带标题的 Word 文档"""
        with patch('docx.Document') as mock_document_class:
            # 模拟段落
            mock_para1 = MagicMock()
            mock_para1.text = '文档标题'
            mock_para1.style.name = 'Heading 1'

            mock_para2 = MagicMock()
            mock_para2.text = '正文内容'
            mock_para2.style.name = 'Normal'

            mock_doc = MagicMock()
            mock_doc.paragraphs = [mock_para1, mock_para2]
            mock_document_class.return_value = mock_doc

            file = SimpleUploadedFile(
                name='test.docx',
                content=b'fake docx content',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

            title, content = parser_service._parse_docx(file)

            assert title == '文档标题'
            assert '<h2>文档标题</h2>' in content
            assert '<p>正文内容</p>' in content

    def test_parse_docx_with_chinese_heading_styles(self, parser_service):
        """测试解析中文标题样式"""
        with patch('docx.Document') as mock_document_class:
            mock_para1 = MagicMock()
            mock_para1.text = '一级标题'
            mock_para1.style.name = '标题 1'
            mock_para1.runs = []

            mock_para2 = MagicMock()
            mock_para2.text = '二级标题'
            mock_para2.style.name = '标题 2'
            mock_para2.runs = []

            mock_doc = MagicMock()
            mock_doc.paragraphs = [mock_para1, mock_para2]
            mock_document_class.return_value = mock_doc

            file = SimpleUploadedFile(
                name='chinese-heading.docx',
                content=b'fake docx content',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

            title, content = parser_service._parse_docx(file)

            assert title == '一级标题'
            assert '<h2>一级标题</h2>' in content
            assert '<h3>二级标题</h3>' in content

    def test_parse_docx_with_outline_level(self, parser_service):
        """测试解析 Word 大纲级别"""
        mock_para = MagicMock()
        mock_para.text = '大纲子标题'
        mock_para.style.name = 'Normal'
        mock_para.runs = []
        mock_para._p.pPr.outlineLvl.val = '1'

        level = parser_service._resolve_docx_heading_level(mock_para, mock_para.text)

        assert level == 2

    def test_parse_docx_numbered_heading_overrides_top_level_style(self, parser_service):
        """测试多级编号标题不会被样式误判为一级标题"""
        mock_para = MagicMock()
        mock_para.text = '1.2.3 权限审批'
        mock_para.style.name = 'Heading 1'
        mock_para.runs = []
        mock_para._p.pPr.outlineLvl.val = '0'

        level = parser_service._resolve_docx_heading_level(mock_para, mock_para.text)

        assert level == 3

    def test_parse_docx_content_heading_starts_from_h2(self, parser_service):
        """测试正文标题不输出 h1"""
        assert parser_service._resolve_docx_content_heading_level(1) == 2
        assert parser_service._resolve_docx_content_heading_level(2) == 3
        assert parser_service._resolve_docx_content_heading_level(6) == 6

    def test_parse_docx_does_not_guess_visual_heading(self, parser_service):
        """测试不靠字号加粗猜标题"""
        mock_run = MagicMock()
        mock_run.text = '强调内容'
        mock_run.bold = True
        mock_run.font.size.pt = 18
        mock_run.font.bold = True

        mock_para = MagicMock()
        mock_para.text = '强调内容'
        mock_para.style.name = 'Normal'
        mock_para.runs = [mock_run]
        mock_para._p.pPr.outlineLvl = None

        level = parser_service._resolve_docx_heading_level(mock_para, mock_para.text)

        assert level is None

    def test_parse_docx_with_list(self, parser_service):
        """测试解析带列表的 Word 文档"""
        with patch('docx.Document') as mock_document_class:
            mock_para1 = MagicMock()
            mock_para1.text = '列表项1'
            mock_para1.style.name = 'List Bullet'

            mock_para2 = MagicMock()
            mock_para2.text = '列表项2'
            mock_para2.style.name = 'List Bullet'

            mock_doc = MagicMock()
            mock_doc.paragraphs = [mock_para1, mock_para2]
            mock_document_class.return_value = mock_doc

            file = SimpleUploadedFile(
                name='list.docx',
                content=b'fake docx content',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

            title, content = parser_service._parse_docx(file)

            # 列表项应该被合并
            assert '<ul><li>列表项1</li><li>列表项2</li></ul>' in content

    def test_parse_docx_empty_paragraphs_preserved(self, parser_service):
        """测试空段落会保留为编辑器空行"""
        with patch('docx.Document') as mock_document_class:
            mock_para1 = MagicMock()
            mock_para1.text = ''
            mock_para1.style.name = 'Normal'

            mock_para2 = MagicMock()
            mock_para2.text = '   '  # 只有空格
            mock_para2.style.name = 'Normal'

            mock_para3 = MagicMock()
            mock_para3.text = '有效内容'
            mock_para3.style.name = 'Normal'

            mock_doc = MagicMock()
            mock_doc.paragraphs = [mock_para1, mock_para2, mock_para3]
            mock_document_class.return_value = mock_doc

            file = SimpleUploadedFile(
                name='test.docx',
                content=b'fake docx content',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

            title, content = parser_service._parse_docx(file)

            assert '<p>有效内容</p>' in content
            assert content == '<p><br></p>\n<p><br></p>\n<p>有效内容</p>'


class TestPptxParser:
    """PowerPoint 文档解析测试"""

    def test_parse_pptx_basic(self, parser_service):
        """测试解析基本 PowerPoint 文档"""
        with patch('pptx.Presentation') as mock_presentation_class:
            # 模拟幻灯片
            mock_shape1 = MagicMock()
            mock_shape1.text = '幻灯片标题'

            mock_shape2 = MagicMock()
            mock_shape2.text = '幻灯片内容'

            mock_slide = MagicMock()
            mock_slide.shapes = [mock_shape1, mock_shape2]

            mock_prs = MagicMock()
            mock_prs.slides = [mock_slide]
            mock_presentation_class.return_value = mock_prs

            file = SimpleUploadedFile(
                name='test.pptx',
                content=b'fake pptx content',
                content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
            )

            title, content = parser_service._parse_pptx(file)

            assert title == '幻灯片标题'
            assert '第 1 页' in content
            assert '幻灯片标题' in content
            assert '<p>幻灯片内容</p>' in content

    def test_parse_pptx_multiline_text(self, parser_service):
        """测试解析多行文本"""
        with patch('pptx.Presentation') as mock_presentation_class:
            mock_shape1 = MagicMock()
            mock_shape1.text = '标题'

            mock_shape2 = MagicMock()
            mock_shape2.text = '第一行\n\n第三行'

            mock_slide = MagicMock()
            mock_slide.shapes = [mock_shape1, mock_shape2]

            mock_prs = MagicMock()
            mock_prs.slides = [mock_slide]
            mock_presentation_class.return_value = mock_prs

            file = SimpleUploadedFile(
                name='test.pptx',
                content=b'fake pptx content',
                content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
            )

            title, content = parser_service._parse_pptx(file)

            assert '<p>第一行</p>' in content
            assert '<p><br></p>' in content
            assert '<p>第三行</p>' in content


class TestPdfParser:
    """PDF 文档解析测试"""

    def test_parse_pdf_basic(self, parser_service):
        """测试解析基本 PDF 文档"""
        with patch('pdfplumber.open') as mock_pdfplumber_open:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = 'PDF标题\n正文内容第一行\n正文内容第二行'

            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page]
            mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
            mock_pdf.__exit__ = MagicMock(return_value=False)

            mock_pdfplumber_open.return_value = mock_pdf

            file = SimpleUploadedFile(
                name='test.pdf',
                content=b'fake pdf content',
                content_type='application/pdf'
            )

            title, content = parser_service._parse_pdf(file)

            assert title == 'PDF标题'
            assert '第 1 页' in content
            assert '<p>PDF标题</p>' in content
            assert '<p>正文内容第一行</p>' in content

    def test_parse_pdf_multiple_pages(self, parser_service):
        """测试解析多页 PDF 文档"""
        with patch('pdfplumber.open') as mock_pdfplumber_open:
            mock_page1 = MagicMock()
            mock_page1.extract_text.return_value = '第一页内容'

            mock_page2 = MagicMock()
            mock_page2.extract_text.return_value = '第二页内容'

            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page1, mock_page2]
            mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
            mock_pdf.__exit__ = MagicMock(return_value=False)

            mock_pdfplumber_open.return_value = mock_pdf

            file = SimpleUploadedFile(
                name='test.pdf',
                content=b'fake pdf content',
                content_type='application/pdf'
            )

            title, content = parser_service._parse_pdf(file)

            assert '第 1 页' in content
            assert '第 2 页' in content
            assert '<p>第一页内容</p>' in content
            assert '<p>第二页内容</p>' in content

    def test_parse_pdf_empty_page(self, parser_service):
        """测试解析包含空页的 PDF 文档"""
        with patch('pdfplumber.open') as mock_pdfplumber_open:
            mock_page1 = MagicMock()
            mock_page1.extract_text.return_value = None  # 空页

            mock_page2 = MagicMock()
            mock_page2.extract_text.return_value = '有内容的页面'

            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page1, mock_page2]
            mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
            mock_pdf.__exit__ = MagicMock(return_value=False)

            mock_pdfplumber_open.return_value = mock_pdf

            file = SimpleUploadedFile(
                name='empty_first_page.pdf',
                content=b'fake pdf content',
                content_type='application/pdf'
            )

            title, content = parser_service._parse_pdf(file)

            # 当第一页为空时，标题从文件名提取（当前实现逻辑）
            assert title == 'empty_first_page'
            # 第二页内容应该被解析
            assert '第 2 页' in content
            assert '<p>有内容的页面</p>' in content


# ============================================
# ParseDocumentView API 测试
# ============================================

@pytest.mark.django_db
class TestParseDocumentAPI:
    """文档解析 API 测试"""

    def test_parse_document_unauthenticated(self, api_client):
        """测试未认证用户无法访问"""
        response = api_client.post('/api/knowledge/parse-document/')
        assert response.status_code == 401

    def test_parse_document_no_file(self, api_client, user):
        """测试未上传文件"""
        api_client.force_authenticate(user=user)
        response = api_client.post('/api/knowledge/parse-document/')

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert '请上传文件' in response.data['message']

    def test_parse_document_unsupported_format(self, api_client, user):
        """测试不支持的文件格式"""
        api_client.force_authenticate(user=user)

        file = SimpleUploadedFile(
            name='test.txt',
            content=b'test content',
            content_type='text/plain'
        )

        response = api_client.post(
            '/api/knowledge/parse-document/',
            {'file': file},
            format='multipart'
        )

        assert response.status_code == 400
        assert response.data['code'] == 'VALIDATION_ERROR'
        assert '不支持的文件格式' in response.data['message']

    @patch.object(DocumentParserService, 'parse')
    def test_parse_document_success(self, mock_parse, api_client, user):
        """测试成功解析文档"""
        mock_parse.return_value = ('测试标题', '<p>测试内容</p>')

        api_client.force_authenticate(user=user)

        file = SimpleUploadedFile(
            name='test.docx',
            content=b'fake docx content',
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

        response = api_client.post(
            '/api/knowledge/parse-document/',
            {'file': file},
            format='multipart'
        )

        assert response.status_code == 200
        assert response.data['code'] == 'SUCCESS'
        assert response.data['data']['suggested_title'] == '测试标题'
        assert response.data['data']['content'] == '<p>测试内容</p>'
        assert response.data['data']['file_type'] == 'docx'

    @patch.object(DocumentParserService, 'parse')
    def test_parse_document_returns_file_type(self, mock_parse, api_client, user):
        """测试返回正确的文件类型"""
        mock_parse.return_value = ('标题', '<p>内容</p>')
        api_client.force_authenticate(user=user)

        # 测试 PDF
        pdf_file = SimpleUploadedFile(
            name='document.pdf',
            content=b'fake pdf content',
            content_type='application/pdf'
        )
        response = api_client.post(
            '/api/knowledge/parse-document/',
            {'file': pdf_file},
            format='multipart'
        )
        assert response.data['data']['file_type'] == 'pdf'

        # 测试 PPTX
        pptx_file = SimpleUploadedFile(
            name='presentation.pptx',
            content=b'fake pptx content',
            content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
        response = api_client.post(
            '/api/knowledge/parse-document/',
            {'file': pptx_file},
            format='multipart'
        )
        assert response.data['data']['file_type'] == 'pptx'

    @patch.object(DocumentParserService, 'parse')
    def test_parse_document_exception_handling(self, mock_parse, api_client, user):
        """测试异常处理"""
        mock_parse.side_effect = Exception('解析错误')

        api_client.force_authenticate(user=user)

        file = SimpleUploadedFile(
            name='test.docx',
            content=b'fake docx content',
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

        response = api_client.post(
            '/api/knowledge/parse-document/',
            {'file': file},
            format='multipart'
        )

        assert response.status_code == 400
        assert response.data['code'] == 'PARSE_ERROR'
        assert '文档解析失败' in response.data['message']


# ============================================
# HTML 转义安全测试
# ============================================

class TestHtmlEscaping:
    """HTML 转义安全测试"""

    def test_docx_html_escaping(self, parser_service):
        """测试 Word 文档内容的 HTML 转义"""
        with patch('docx.Document') as mock_document_class:
            mock_para = MagicMock()
            mock_para.text = '<script>alert("xss")</script>'
            mock_para.style.name = 'Normal'

            mock_doc = MagicMock()
            mock_doc.paragraphs = [mock_para]
            mock_document_class.return_value = mock_doc

            file = SimpleUploadedFile(
                name='test.docx',
                content=b'fake docx content',
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )

            title, content = parser_service._parse_docx(file)

            # 确保 HTML 被转义
            assert '<script>' not in content
            assert '&lt;script&gt;' in content

    def test_pdf_html_escaping(self, parser_service):
        """测试 PDF 文档内容的 HTML 转义"""
        with patch('pdfplumber.open') as mock_pdfplumber_open:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = '<img src=x onerror=alert(1)>'

            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page]
            mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
            mock_pdf.__exit__ = MagicMock(return_value=False)

            mock_pdfplumber_open.return_value = mock_pdf

            file = SimpleUploadedFile(
                name='test.pdf',
                content=b'fake pdf content',
                content_type='application/pdf'
            )

            title, content = parser_service._parse_pdf(file)

            # 确保 HTML 被转义
            assert '<img' not in content
            assert '&lt;img' in content
