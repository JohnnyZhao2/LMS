"""文档解析视图。"""
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response

from ..services import DocumentParserService


class ParseDocumentView(APIView):
    """POST /api/knowledge/parse-document/ — 上传文档并解析为 HTML。"""

    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='请上传文件')

        try:
            suggested_title, content = DocumentParserService().parse(file)
        except ValueError as e:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message=str(e)) from e

        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        return success_response({
            'suggested_title': suggested_title,
            'content': content,
            'file_type': ext,
        })
