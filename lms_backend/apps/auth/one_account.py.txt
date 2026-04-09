import base64
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any, Dict
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

from core.exceptions import BusinessError, ErrorCodes

try:
    from gmssl import sm2
except ImportError as exc:  # pragma: no cover
    raise RuntimeError('缺少 gmssl 依赖，请安装 requirements.txt') from exc


@dataclass(frozen=True)
class OneAccountConfig:
    enabled: bool
    domain: str
    client_id: str
    redirect_uri: str
    scope: str
    token_path: str
    auth_path: str
    client_private_key: str


class OneAccountClient:
    REQUIRED_HEADERS = ('Accept', 'Content-Type', 'X-ClientId', 'X-Nonce', 'X-TimeStamp')

    def __init__(self) -> None:
        config = settings.ONE_ACCOUNT_OIDC
        self.config = OneAccountConfig(
            enabled=config['ENABLED'],
            domain=config['DOMAIN'].rstrip('/'),
            client_id=config['CLIENT_ID'],
            redirect_uri=config['REDIRECT_URI'],
            scope=config['SCOPE'],
            token_path=config['TOKEN_PATH'],
            auth_path=config['AUTH_PATH'],
            client_private_key=config['CLIENT_PRIVATE_KEY'],
        )

    def build_authorize_url(self, *, state: str) -> str:
        if not self.config.enabled:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='统一认证未启用')

        params = {
            'client_id': self.config.client_id,
            'response_type': 'code',
            'redirect_uri': self.config.redirect_uri,
            'scope': self.config.scope,
            'state': state,
        }
        return f"{self.config.domain}{self.config.auth_path}?{urlencode(params)}"

    def exchange_code(self, *, code: str) -> Dict[str, Any]:
        if not self.config.enabled:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='统一认证未启用')

        query_pairs = [
            ('client_id', self.config.client_id),
            ('code', code),
            ('grant_type', 'authorization_code'),
        ]
        query_string = urlencode(query_pairs)
        token_url = f"{self.config.domain}{self.config.token_path}?{query_string}"

        timestamp = str(int(time.time() * 1000))
        nonce = secrets.token_hex(16)
        headers_to_sign = {
            'Accept': '*/*',
            'Content-Type': '',
            'X-ClientId': self.config.client_id,
            'X-Nonce': nonce,
            'X-TimeStamp': timestamp,
        }
        header_lines = '\n'.join(f'{key}:{value}' for key, value in headers_to_sign.items())
        x_content = ''
        sign_payload = f'POST\n{header_lines}\n{x_content}\n{query_string}'

        signature_base64 = self._sm2_sign_base64(sign_payload)
        request_headers = {
            **headers_to_sign,
            'X-Signature-Headers': ','.join(self.REQUIRED_HEADERS),
            'X-Content': x_content,
            'X-Signature': signature_base64,
        }

        req = Request(token_url, method='POST', headers=request_headers)
        try:
            with urlopen(req, timeout=15) as response:
                payload = response.read().decode('utf-8')
        except Exception as exc:  # noqa: BLE001
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='统一认证换取令牌失败',
            ) from exc

        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='统一认证返回格式错误',
            ) from exc

        id_token = data.get('id_token')
        if not id_token:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='统一认证未返回id_token')
        claims = self._decode_jwt_payload(id_token)
        employee_id = claims.get('employeeId')
        if not employee_id:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少employeeId')

        return {
            'employee_id': employee_id,
        }

    def _sm2_sign_base64(self, text: str) -> str:
        signer = sm2.CryptSM2(private_key=self.config.client_private_key, public_key='')
        random_hex = secrets.token_hex(32)
        signature_hex = signer.sign_with_sm3(text.encode('utf-8'), random_hex)
        return base64.b64encode(bytes.fromhex(signature_hex)).decode('utf-8')

    def _decode_jwt_payload(self, token: str) -> Dict[str, Any]:
        parts = token.split('.')
        if len(parts) != 3:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token格式错误')
        payload_segment = parts[1]
        payload_padding = '=' * ((4 - len(payload_segment) % 4) % 4)
        decoded = base64.urlsafe_b64decode(payload_segment + payload_padding)
        try:
            claims = json.loads(decoded.decode('utf-8'))
        except json.JSONDecodeError as exc:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token解析失败') from exc
        audience = claims.get('aud')
        if isinstance(audience, list):
            is_valid_aud = self.config.client_id in audience
        else:
            is_valid_aud = audience == self.config.client_id
        if not is_valid_aud:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token受众不匹配')

        exp = claims.get('exp')
        if not isinstance(exp, int):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少exp')
        if exp <= int(time.time()):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token已过期')
        return claims
