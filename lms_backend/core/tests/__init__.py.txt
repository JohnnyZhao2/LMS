"""
Tests for custom throttle classes.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        'DEFAULT_THROTTLE_RATES': {
            'anon': '5/minute',
            'user': '10/minute',
            'auth': '3/minute',
        }
    }
)
class ThrottleTestCase(TestCase):
    """Test throttle functionality."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            employee_id='TEST001',
            name='Test User',
            password='testpass123'
        )

    def test_auth_throttle_anonymous(self):
        """Test that auth endpoints are throttled for anonymous users."""
        url = '/api/auth/login/'
        data = {'employee_id': 'TEST001', 'password': 'wrongpass'}

        # Make requests up to the limit
        for i in range(3):
            response = self.client.post(url, data)
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        # Next request should be throttled
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_user_throttle_authenticated(self):
        """Test that authenticated users have higher rate limits."""
        self.client.force_authenticate(user=self.user)
        url = '/api/users/'

        # Authenticated users should have higher limits
        for i in range(10):
            response = self.client.get(url)
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

        # Next request should be throttled
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
