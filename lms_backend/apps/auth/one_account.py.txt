import base64
import binascii
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
    token_path: str
    auth_path: str
    client_private_key: str
    center_public_key: str


class OneAccountClient:
    REQUIRED_HEADERS = ('Accept', 'Content-Type', 'X-ClientId', 'X-Nonce', 'X-TimeStamp')

    def __init__(self) -> None:
        config = settings.ONE_ACCOUNT_OIDC
        self.config = OneAccountConfig(
            enabled=config['ENABLED'],
            domain=config['DOMAIN'].rstrip('/'),
            client_id=config['CLIENT_ID'],
            redirect_uri=config['REDIRECT_URI'],
            token_path=config['TOKEN_PATH'],
            auth_path=config['AUTH_PATH'],
            client_private_key=self._normalize_private_key(config['CLIENT_PRIVATE_KEY']),
            center_public_key=self._normalize_public_key(config['CENTER_PUBLIC_KEY']),
        )

    def _ensure_ready(self) -> None:
        if not self.config.enabled:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='统一认证未启用')

        required_fields = {
            'DOMAIN': self.config.domain,
            'CLIENT_ID': self.config.client_id,
            'REDIRECT_URI': self.config.redirect_uri,
            'AUTH_PATH': self.config.auth_path,
            'TOKEN_PATH': self.config.token_path,
            'CLIENT_PRIVATE_KEY': self.config.client_private_key,
            'CENTER_PUBLIC_KEY': self.config.center_public_key,
        }
        missing_fields = [field_name for field_name, field_value in required_fields.items() if not field_value]
        if missing_fields:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message=f'统一认证配置缺失：{", ".join(missing_fields)}',
            )

    def build_authorize_url(self) -> str:
        self._ensure_ready()

        params = {
            'client_id': self.config.client_id,
            'redirect_uri': self.config.redirect_uri,
        }
        return f"{self.config.domain}{self.config.auth_path}?{urlencode(params)}"

    def exchange_code(self, *, code: str) -> Dict[str, Any]:
        self._ensure_ready()

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

        claims = self._decode_and_validate_id_token(id_token)
        employee_id = claims.get('employeeId')
        if not employee_id:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少employeeId')

        return {
            'employee_id': employee_id,
        }

    def _sm2_sign_base64(self, text: str) -> str:
        client_public_key = self._derive_public_key(self.config.client_private_key)
        signer = sm2.CryptSM2(
            private_key=self.config.client_private_key,
            public_key=client_public_key,
        )
        random_hex = secrets.token_hex(32)
        signature_hex = signer.sign_with_sm3(text.encode('utf-8'), random_hex)
        return base64.b64encode(bytes.fromhex(signature_hex)).decode('utf-8')

    def _decode_and_validate_id_token(self, token: str) -> Dict[str, Any]:
        parts = token.split('.')
        if len(parts) != 3:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token格式错误')

        header_segment, payload_segment, signature_segment = parts
        signing_input = f'{header_segment}.{payload_segment}'.encode('utf-8')
        signature_bytes = self._decode_base64url_segment(signature_segment, label='id_token签名')

        verifier = sm2.CryptSM2(private_key='', public_key=self.config.center_public_key)
        if not verifier.verify_with_sm3(signature_bytes.hex(), signing_input):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token签名校验失败')

        claims = self._decode_jwt_json_segment(payload_segment, label='id_token载荷')
        self._validate_audience(claims)
        self._validate_expiry(claims)
        return claims

    def _decode_base64url_segment(self, segment: str, *, label: str) -> bytes:
        padding = '=' * ((4 - len(segment) % 4) % 4)
        try:
            return base64.urlsafe_b64decode(segment + padding)
        except (ValueError, binascii.Error) as exc:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message=f'{label}解析失败') from exc

    def _decode_jwt_json_segment(self, segment: str, *, label: str) -> Dict[str, Any]:
        decoded = self._decode_base64url_segment(segment, label=label)
        try:
            data = json.loads(decoded.decode('utf-8'))
        except json.JSONDecodeError as exc:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message=f'{label}解析失败') from exc
        if not isinstance(data, dict):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message=f'{label}格式错误')
        return data

    def _validate_audience(self, claims: Dict[str, Any]) -> None:
        audience = claims.get('aud')
        if not isinstance(audience, list) or not audience:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少aud')

        client_info_raw = audience[0]
        if not isinstance(client_info_raw, str):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token aud格式错误')

        try:
            client_info = json.loads(client_info_raw)
        except json.JSONDecodeError as exc:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token aud格式错误') from exc

        if client_info.get('id') != self.config.client_id:
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token受众不匹配')

    def _validate_expiry(self, claims: Dict[str, Any]) -> None:
        exp = claims.get('exp')
        if not isinstance(exp, (int, float)):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token缺少exp')
        if exp <= int(time.time()):
            raise BusinessError(code=ErrorCodes.AUTH_INVALID_CREDENTIALS, message='id_token已过期')

    def _normalize_private_key(self, value: str) -> str:
        return ''.join(value.split())

    def _derive_public_key(self, private_key: str) -> str:
        signer = sm2.CryptSM2(private_key=private_key, public_key='')
        return signer._kg(int(private_key, 16), sm2.default_ecc_table['g'])  # noqa: SLF001

    def _normalize_public_key(self, value: str) -> str:
        normalized = ''.join(value.split())
        if normalized.startswith('04'):
            return normalized[2:]
        return normalized
