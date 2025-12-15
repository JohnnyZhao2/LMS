"""
Tests for Notification API endpoints.

Requirements: 7.5, 9.5, 11.6
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from tests.factories import (
    UserFactory,
    RoleFactory,
    UserRoleFactory,
    TaskFactory,
    NotificationFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student_user(db):
    """Create a student user."""
    user = UserFactory()
    return user


@pytest.fixture
def authenticated_client(api_client, student_user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.mark.django_db
class TestNotificationListAPI:
    """Tests for notification list endpoint."""
    
    def test_list_notifications_success(self, authenticated_client, student_user):
        """Test listing notifications for authenticated user."""
        # Create notifications for the user
        NotificationFactory.create_batch(3, recipient=student_user)
        
        # Create notifications for another user (should not appear)
        other_user = UserFactory()
        NotificationFactory.create_batch(2, recipient=other_user)
        
        url = reverse('notification-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
    
    def test_list_notifications_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list notifications."""
        url = reverse('notification-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_notifications_ordered_by_created_at(self, authenticated_client, student_user):
        """Test that notifications are ordered by created_at descending."""
        n1 = NotificationFactory(recipient=student_user, title='First')
        n2 = NotificationFactory(recipient=student_user, title='Second')
        n3 = NotificationFactory(recipient=student_user, title='Third')
        
        url = reverse('notification-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Most recent first
        titles = [n['title'] for n in response.data['results']]
        assert titles == ['Third', 'Second', 'First']


@pytest.mark.django_db
class TestNotificationDetailAPI:
    """Tests for notification detail endpoint."""
    
    def test_get_notification_detail(self, authenticated_client, student_user):
        """Test getting notification detail."""
        notification = NotificationFactory(recipient=student_user)
        
        url = reverse('notification-detail', kwargs={'pk': notification.pk})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == notification.pk
        assert response.data['title'] == notification.title
    
    def test_get_other_user_notification_fails(self, authenticated_client, student_user):
        """Test that users cannot access other users' notifications."""
        other_user = UserFactory()
        notification = NotificationFactory(recipient=other_user)
        
        url = reverse('notification-detail', kwargs={'pk': notification.pk})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMarkNotificationReadAPI:
    """Tests for marking notification as read."""
    
    def test_mark_notification_read(self, authenticated_client, student_user):
        """Test marking a notification as read."""
        notification = NotificationFactory(recipient=student_user, is_read=False)
        
        url = reverse('notification-read', kwargs={'pk': notification.pk})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        notification.refresh_from_db()
        assert notification.is_read is True
        assert notification.read_at is not None
    
    def test_mark_already_read_notification(self, authenticated_client, student_user):
        """Test marking an already read notification."""
        notification = NotificationFactory(recipient=student_user, is_read=True)
        
        url = reverse('notification-read', kwargs={'pk': notification.pk})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestMarkAllNotificationsReadAPI:
    """Tests for marking all notifications as read."""
    
    def test_mark_all_read(self, authenticated_client, student_user):
        """Test marking all notifications as read."""
        NotificationFactory.create_batch(5, recipient=student_user, is_read=False)
        
        url = reverse('notification-read-all')
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 5
        
        # Verify all are marked as read
        unread_count = Notification.objects.filter(
            recipient=student_user, is_read=False
        ).count()
        assert unread_count == 0
    
    def test_mark_all_read_no_unread(self, authenticated_client, student_user):
        """Test marking all read when no unread notifications."""
        NotificationFactory.create_batch(3, recipient=student_user, is_read=True)
        
        url = reverse('notification-read-all')
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0


@pytest.mark.django_db
class TestUnreadCountAPI:
    """Tests for unread notification count endpoint."""
    
    def test_get_unread_count(self, authenticated_client, student_user):
        """Test getting unread notification count."""
        NotificationFactory.create_batch(3, recipient=student_user, is_read=False)
        NotificationFactory.create_batch(2, recipient=student_user, is_read=True)
        
        url = reverse('notification-unread-count')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['unread_count'] == 3
    
    def test_get_unread_count_zero(self, authenticated_client, student_user):
        """Test getting unread count when all are read."""
        NotificationFactory.create_batch(3, recipient=student_user, is_read=True)
        
        url = reverse('notification-unread-count')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['unread_count'] == 0


@pytest.mark.django_db
class TestNotificationService:
    """Tests for NotificationService."""
    
    def test_send_task_assigned_notification(self, db):
        """Test sending task assigned notifications."""
        task = TaskFactory()
        users = UserFactory.create_batch(3)
        user_ids = [u.id for u in users]
        
        notifications = NotificationService.send_task_assigned(task, user_ids)
        
        assert len(notifications) == 3
        for notification in notifications:
            assert notification.notification_type == 'TASK_ASSIGNED'
            assert notification.task == task
            assert notification.recipient_id in user_ids
    
    def test_send_deadline_reminder(self, db):
        """Test sending deadline reminder notification."""
        task = TaskFactory()
        user = UserFactory()
        
        notification = NotificationService.send_deadline_reminder(task, user.id)
        
        assert notification.notification_type == 'DEADLINE_REMINDER'
        assert notification.task == task
        assert notification.recipient == user
    
    def test_get_unread_count(self, db):
        """Test getting unread count via service."""
        user = UserFactory()
        NotificationFactory.create_batch(5, recipient=user, is_read=False)
        NotificationFactory.create_batch(3, recipient=user, is_read=True)
        
        count = NotificationService.get_unread_count(user)
        
        assert count == 5
    
    def test_mark_all_as_read(self, db):
        """Test marking all notifications as read via service."""
        user = UserFactory()
        NotificationFactory.create_batch(5, recipient=user, is_read=False)
        
        count = NotificationService.mark_all_as_read(user)
        
        assert count == 5
        assert Notification.objects.filter(recipient=user, is_read=False).count() == 0
