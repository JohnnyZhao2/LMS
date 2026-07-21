import base64
import json
import time
from dataclasses import dataclass
from typing import Any, Dict
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

from core.exceptions import BusinessError, ErrorCodes


@dataclass(frozen=True)
class OneAccountConfig:
    enabled: bool
    domain: str
    client_id: str
    redirect_uri: str
    response_type: str
    scope: str
    state: str
    token_path: str
    auth_path: str
    client_private_key: str


class OneAccountClient:
    REQUIRED_HEADERS = ('Accept', 'Content-Type', 'X-ClientId', 'X-Nonce', 'X-TimeStamp')
    TOKEN_CONTENT_TYPE = 'application/json;charset=utf-8'

    def __init__(self) -> None:
        config = settings.ONE_ACCOUNT_OIDC
        self.config = OneAccountConfig(
            enabled=config['ENABLED'],
            domain=config['DOMAIN'].rstrip('/'),
            client_id=config['CLIENT_ID'],
            redirect_uri=config['REDIRECT_URI'],
            response_type=config.get('RESPONSE_TYPE', ''),
            scope=config.get('SCOPE', ''),
            state=config.get('STATE', ''),
            token_path=config['TOKEN_PATH'],
            auth_path=config['AUTH_PATH'],
            client_private_key=''.join(config['CLIENT_PRIVATE_KEY'].split()),
        )

    def _ensure_enabled(self) -> None:
        if not self.config.enabled:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='统一认证未启用')

    def build_authorize_url(self) -> str:
        self._ensure_enabled()

        params = {
            'client_id': self.config.client_id,
            'redirect_uri': self.config.redirect_uri,
        }
        optional_params = {
            'response_type': self.config.response_type,
            'scope': self.config.scope,
            'state': self.config.state,
        }
        params.update({key: value for key, value in optional_params.items() if value})
        return f"{self.config.domain}{self.config.auth_path}?{urlencode(params)}"

    def exchange_code(self, *, code: str) -> Dict[str, Any]:
        self._ensure_enabled()

        query_string = urlencode((
            ('client_id', self.config.client_id),
            ('code', code),
            ('grant_type', 'authorization_code'),
        ))
        token_url = f"{self.config.domain}{self.config.token_path}?{query_string}"

        timestamp = str(int(time.time() * 1000))
        nonce = timestamp
        headers_to_sign = {
            'Accept': '*/*',
            'Content-Type': self.TOKEN_CONTENT_TYPE,
            'X-ClientId': self.config.client_id,
            'X-Nonce': nonce,
            'X-TimeStamp': timestamp,
        }
        header_lines = (
            'Accept:*/*\n'
            f'Content-Type:{self.TOKEN_CONTENT_TYPE}\n'
            f'X-ClientId:{self.config.client_id}\n'
            f'X-Nonce:{nonce}\n'
            f'X-TimeStamp:{timestamp}\n'
        )
        x_content = ''
        sign_payload = f'POST\n{header_lines}\n{query_string}'

        signature_base64 = self._cmb_sm2_sign_base64(sign_payload.encode('utf-8'))
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

        claims = self._decode_id_token(id_token)
        employee_id = claims.get('employeeId')
        if not employee_id:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少employeeId')

        return {
            'employee_id': employee_id,
        }

    def _cmb_sm2_sign_base64(self, data: bytes) -> str:
        from CMBSM.CMBSMFunction import CMBSM2SignWithSM3
        key_bytes = base64.b64decode(self.config.client_private_key)
        return base64.b64encode(CMBSM2SignWithSM3(key_bytes, data)).decode('utf-8')

    def _decode_id_token(self, token: str) -> Dict[str, Any]:
        parts = token.split('.')
        if len(parts) != 3:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token格式错误')

        payload = parts[1]
        payload += '=' * ((4 - len(payload) % 4) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
        if not isinstance(claims, dict):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token载荷格式错误')
        return claims
