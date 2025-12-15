"""
Common permission classes for LMS API.

This module re-exports permission classes from apps.users.permissions for backward compatibility.
The detailed implementations are in apps/users/permissions.py (implemented in task 3.1).

Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
"""

# Re-export all permission classes from apps.users.permissions
from apps.users.permissions import (
    IsAuthenticated,
    IsAdmin,
    IsMentor,
    IsDeptManager,
    IsTeamManager,
    IsTeamManagerReadOnly,
    IsAdminOrMentorOrDeptManager,
    IsOwnerOrAdmin,
    CanAccessMenteeData,
    CanCreateTaskForStudents,
    CanCreateSpotCheck,
    get_accessible_students,
    filter_queryset_by_data_scope,
)

__all__ = [
    'IsAuthenticated',
    'IsAdmin',
    'IsMentor',
    'IsDeptManager',
    'IsTeamManager',
    'IsTeamManagerReadOnly',
    'IsAdminOrMentorOrDeptManager',
    'IsOwnerOrAdmin',
    'CanAccessMenteeData',
    'CanCreateTaskForStudents',
    'CanCreateSpotCheck',
    'get_accessible_students',
    'filter_queryset_by_data_scope',
]
