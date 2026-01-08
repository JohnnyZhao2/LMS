"""
Utility functions for LMS.
"""
import random
import string
from django.utils import timezone
def generate_random_password(length: int = 8) -> str:
    """
    Generate a random password.
    Args:
        length: Length of the password (default: 8)
    Returns:
        Random password string
    """
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))
def get_current_time():
    """
    Get current time with timezone.
    Returns:
        Current datetime with timezone
    """
    return timezone.now()
def is_past_deadline(deadline) -> bool:
    """
    Check if a deadline has passed.
    Args:
        deadline: Datetime to check
    Returns:
        True if deadline has passed, False otherwise
    """
    if deadline is None:
        return False
    return timezone.now() > deadline
def is_within_time_window(start_time, end_time) -> bool:
    """
    Check if current time is within a time window.
    Args:
        start_time: Start of the window
        end_time: End of the window
    Returns:
        True if current time is within the window
    """
    now = timezone.now()
    if start_time and now < start_time:
        return False
    if end_time and now > end_time:
        return False
    return True
