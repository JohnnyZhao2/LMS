import base64
import json
import time
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from gmssl import sm2

from apps.auth.one_account import OneAccountClient
from apps.users.models import Department, User


def _configure_one_account(settings, *, client_id='client_12345678901234567890123456', center_public_key='1') -> None:
    settings.ONE_ACCOUNT_OIDC = {
        'ENABLED': True,
        'DOMAIN': 'http://test.cn',
        'CLIENT_ID': client_id,
        'REDIRECT_URI': 'http://localhost:5173/login',
        'AUTH_PATH': '/auth-server/auth',
        'TOKEN_PATH': '/auth-server/token',
        'CLIENT_PRIVATE_KEY': '1'.zfill(64),
        'CENTER_PUBLIC_KEY': center_public_key,
    }


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')


def _build_signed_id_token(*, client_id: str, employee_id: str) -> tuple[str, str]:
    private_key = '1'.zfill(64)
    signer = sm2.CryptSM2(private_key=private_key, public_key='')
    public_key = signer._kg(int(private_key, 16), sm2.default_ecc_table['g'])  # noqa: SLF001

    header_segment = _base64url_encode(json.dumps({'alg': 'SM2', 'typ': 'JWT'}, separators=(',', ':')).encode('utf-8'))
    payload_segment = _base64url_encode(
        json.dumps(
            {
                'aud': [json.dumps({'id': client_id}, separators=(',', ':'))],
                'employeeId': employee_id,
                'exp': int(time.time()) + 3600,
            },
            separators=(',', ':'),
        ).encode('utf-8')
    )
    signing_input = f'{header_segment}.{payload_segment}'.encode('utf-8')

    signing_client = sm2.CryptSM2(private_key=private_key, public_key=public_key)
    signature_hex = signing_client.sign_with_sm3(signing_input, '2'.zfill(64))
    signature_segment = _base64url_encode(bytes.fromhex(signature_hex))
    return f'{header_segment}.{payload_segment}.{signature_segment}', public_key


def test_one_account_client_signatures_can_be_verified_by_client_public_key(settings):
    client_id = 'client_12345678901234567890123456'
    _configure_one_account(settings, client_id=client_id)

    client = OneAccountClient()
    client_public_key = client._derive_public_key(client.config.client_private_key)  # noqa: SLF001
    verifier = sm2.CryptSM2(private_key='', public_key=client_public_key)

    message = (
        'POST\n'
        'Accept:*/*\n'
        'Content-Type:\n'
        f'X-ClientId:{client_id}\n'
        'X-Nonce:test-nonce\n'
        'X-TimeStamp:1713542400000\n'
        '\n'
        f'client_id={client_id}&code=test-code&grant_type=authorization_code'
    )
    signature_hex = base64.b64decode(client._sm2_sign_base64(message)).hex()  # noqa: SLF001

    assert verifier.verify_with_sm3(signature_hex, message.encode('utf-8'))


def test_one_account_authorize_url_only_contains_required_query_params(settings, api_client, unwrap_response_data):
    _configure_one_account(settings)

    response = api_client.get('/api/auth/one-account/authorize-url/')

    assert response.status_code == 200
    payload = unwrap_response_data(response)
    authorize_url = urlparse(payload['authorize_url'])
    query = parse_qs(authorize_url.query)

    assert authorize_url.scheme == 'http'
    assert authorize_url.netloc == 'test.cn'
    assert authorize_url.path == '/auth-server/auth'
    assert set(query) == {'client_id', 'redirect_uri'}
    assert query['client_id'] == ['client_12345678901234567890123456']
    assert query['redirect_uri'] == ['http://localhost:5173/login']


@pytest.mark.django_db
def test_one_account_code_login_returns_session(api_client):
    department = Department.objects.create(name='统一认证部门', code='ONE_ACCOUNT_DEPT')
    User.objects.create_user(
        employee_id='EMP_SCAN_LOGIN',
        username='扫码用户',
        password='password123',
        department=department,
    )

    with patch('apps.auth.services.OneAccountClient.exchange_code', return_value={'employee_id': 'EMP_SCAN_LOGIN'}):
        response = api_client.post(
            '/api/auth/one-account/code-login/',
            {'code': 'scan-login-code'},
            format='json',
        )

    assert response.status_code == 200
    payload = response.data['data']
    assert payload['user']['employee_id'] == 'EMP_SCAN_LOGIN'
    assert payload['current_role'] == 'STUDENT'
    assert 'access_token' in payload
    assert 'refresh_token' in payload


def test_one_account_client_validates_signed_id_token(settings):
    client_id = 'client_12345678901234567890123456'
    token, public_key = _build_signed_id_token(client_id=client_id, employee_id='EMP_SIGNED_TOKEN')
    _configure_one_account(settings, client_id=client_id, center_public_key=f'04{public_key}')

    client = OneAccountClient()
    claims = client._decode_and_validate_id_token(token)  # noqa: SLF001

    assert claims['employeeId'] == 'EMP_SIGNED_TOKEN'
    assert claims['aud'] == [json.dumps({'id': client_id}, separators=(',', ':'))]
