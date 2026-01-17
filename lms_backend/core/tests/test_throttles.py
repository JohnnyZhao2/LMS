"""
Tests for custom throttle classes.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import Department

User = get_user_model()


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    },
    REST_FRAMEWORK={
        'DEFAULT_THROTTLE_RATES': {
            'anon': '5/minute',
            'user': '10/minute',
            'auth': '2/minute',
        }
    }
)
class ThrottleTestCase(TestCase):
    """Test throttle functionality."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.department = Department.objects.create(name='Test Dept', code='TEST')
        self.user = User.objects.create_user(
            employee_id='TEST001',
            username='Test User',
            password='testpass123',
            department=self.department
        )

    def tearDown(self):
        cache.clear()

    def test_auth_throttle_on_login(self):
        """Test that login endpoint is throttled after exceeding rate limit."""
        url = '/api/auth/login/'
        data = {'employee_id': 'TEST001', 'password': 'testpass123'}

        # First 2 requests should succeed (within limit)
        response1 = self.client.post(url, data)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        response2 = self.client.post(url, data)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Third request should be throttled
        response3 = self.client.post(url, data)
        self.assertEqual(response3.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_auth_throttle_on_refresh(self):
        """Test that token refresh endpoint is throttled."""
        url = '/api/auth/refresh/'
        data = {'refresh_token': 'invalid_token'}

        # First 2 requests should not be throttled (will fail with 400 due to invalid token)
        response1 = self.client.post(url, data)
        self.assertNotEqual(response1.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        response2 = self.client.post(url, data)
        self.assertNotEqual(response2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Third request should be throttled
        response3 = self.client.post(url, data)
        self.assertEqual(response3.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
