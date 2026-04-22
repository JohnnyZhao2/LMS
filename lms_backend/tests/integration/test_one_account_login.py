import base64
import json
import time
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest

from apps.auth.one_account import OneAccountClient
from apps.users.models import Department, User


def _configure_one_account(settings, *, client_id='client_12345678901234567890123456') -> None:
    settings.ONE_ACCOUNT_OIDC = {
        'ENABLED': True,
        'DOMAIN': 'http://test.cn',
        'CLIENT_ID': client_id,
        'REDIRECT_URI': 'http://localhost:5173/login',
        'RESPONSE_TYPE': '',
        'SCOPE': '',
        'STATE': '',
        'AUTH_PATH': '/auth-server/auth',
        'TOKEN_PATH': '/auth-server/token',
        'CLIENT_PRIVATE_KEY': base64.b64encode(b'1' * 32).decode('utf-8'),
    }


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')


def _build_id_token(*, client_id: str, employee_id: str) -> str:
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
    return f'{header_segment}.{payload_segment}.signature'


def test_one_account_token_request_uses_cmb_signature_payload(settings):
    client_id = 'client_12345678901234567890123456'
    _configure_one_account(settings, client_id=client_id)

    client = OneAccountClient()
    token = _build_id_token(client_id=client_id, employee_id='EMP_SIGNED_TOKEN')
    expected_payload = (
        'POST\n'
        'Accept:*/*\n'
        'Content-Type:application/json;charset=utf-8\n'
        f'X-ClientId:{client_id}\n'
        'X-Nonce:1713542400000\n'
        'X-TimeStamp:1713542400000\n'
        '\n'
        f'client_id={client_id}&code=test-code&grant_type=authorization_code'
    )

    class MockResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self):
            return json.dumps({'id_token': token}).encode('utf-8')

    with (
        patch('time.time', return_value=1713542400),
        patch.object(client, '_cmb_sm2_sign_base64', return_value='mock-signature') as sign_mock,
        patch('apps.auth.one_account.urlopen', return_value=MockResponse()) as urlopen_mock,
    ):
        result = client.exchange_code(code='test-code')

    assert result == {'employee_id': 'EMP_SIGNED_TOKEN'}
    sign_mock.assert_called_once_with(expected_payload.encode('utf-8'))
    request = urlopen_mock.call_args.args[0]
    assert request.full_url == (
        'http://test.cn/auth-server/token?'
        f'client_id={client_id}&code=test-code&grant_type=authorization_code'
    )
    assert request.headers['Content-type'] == 'application/json;charset=utf-8'
    assert request.headers['X-clientid'] == client_id
    assert request.headers['X-nonce'] == '1713542400000'
    assert request.headers['X-timestamp'] == '1713542400000'
    assert request.headers['X-signature'] == 'mock-signature'


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


def test_one_account_client_decodes_id_token(settings):
    client_id = 'client_12345678901234567890123456'
    token = _build_id_token(client_id=client_id, employee_id='EMP_SIGNED_TOKEN')
    _configure_one_account(settings, client_id=client_id)

    client = OneAccountClient()
    claims = client._decode_id_token(token)  # noqa: SLF001

    assert claims['employeeId'] == 'EMP_SIGNED_TOKEN'
    assert claims['aud'] == [json.dumps({'id': client_id}, separators=(',', ':'))]
