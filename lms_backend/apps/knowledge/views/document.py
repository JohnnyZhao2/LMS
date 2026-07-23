"""
文档解析视图
提供文档上传解析接口
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated

from core.exceptions import BusinessError, ErrorCodes
from ..services import DocumentParserService


class ParseDocumentView(APIView):
    """
    文档解析接口

    POST /api/knowledge/parse-document/
    上传文档文件，解析提取文本内容返回 HTML 格式
    """
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            raise BusinessError(ErrorCodes.VALIDATION_ERROR, '请上传文件')

        try:
            parser = DocumentParserService()
            suggested_title, content = parser.parse(file)

            ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''

            return Response({
                'suggested_title': suggested_title,
                'content': content,
                'file_type': ext
            })
        except ValueError as e:
            raise BusinessError(ErrorCodes.VALIDATION_ERROR, str(e)) from e
        except BusinessError:
            raise
        except Exception as e:
            raise BusinessError('PARSE_ERROR', f'文档解析失败：{str(e)}') from e
