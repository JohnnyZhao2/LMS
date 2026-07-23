"""成功响应由 EnvelopeJSONRenderer 统一包装为 {code, message, data}。"""
from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """status < 400 时包装 data；错误 envelope 原样输出。"""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get('response')
        if response is not None and response.status_code >= 400:
            return super().render(data, accepted_media_type, renderer_context)
        return super().render(
            {'code': 'SUCCESS', 'message': 'success', 'data': data},
            accepted_media_type,
            renderer_context,
        )
