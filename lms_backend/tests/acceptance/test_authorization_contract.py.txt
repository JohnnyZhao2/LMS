"""Reviewed acceptance snapshot for roles, permissions and data scopes.

Any new operation or role-rule change must update this file deliberately. That turns
silent acceptance gaps into an explicit test failure during release checks.
"""

from apps.authorization.constants import (
    PERMISSION_CATALOG,
    PERMISSION_SCOPE_RULES,
    ROLE_PERMISSION_DEFAULTS,
    ROLE_SYSTEM_PERMISSION_DEFAULTS,
    SYSTEM_MANAGED_PERMISSION_CODES,
)


EXPECTED_PERMISSION_CODES = {
    'activity_log.policy.update', 'activity_log.view',
    'dashboard.team_manager.view',
    'grading.score', 'grading.view',
    'knowledge.create', 'knowledge.delete', 'knowledge.update', 'knowledge.view',
    'profile.student.update', 'profile.student.view',
    'question.create', 'question.delete', 'question.update', 'question.view',
    'quiz.create', 'quiz.delete', 'quiz.update', 'quiz.view',
    'role_permission_template.update', 'role_permission_template.view',
    'spot_check.create', 'spot_check.delete', 'spot_check.submit', 'spot_check.update', 'spot_check.view',
    'submission.answer', 'submission.review',
    'tag.create', 'tag.delete', 'tag.update', 'tag.view',
    'task.analytics.view', 'task.assign', 'task.create', 'task.delete', 'task.update', 'task.view',
    'user.activate', 'user.avatar.update', 'user.create', 'user.delete',
    'user.permission.update', 'user.permission.view', 'user.role.assign', 'user.update', 'user.view',
}

EXPECTED_SYSTEM_MANAGED_PERMISSION_CODES = {
    'activity_log.policy.update',
    'dashboard.admin.view', 'dashboard.mentor.view', 'dashboard.student.view', 'dashboard.team_manager.view',
    'profile.student.update', 'profile.student.view',
    'role_permission_template.update', 'role_permission_template.view',
    'submission.answer', 'submission.review',
}

EXPECTED_ROLE_DEFAULTS = {
    'STUDENT': {
        'knowledge.view', 'task.view', 'spot_check.view', 'spot_check.submit',
    },
    'MENTOR': {
        'tag.view', 'tag.create',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.analytics.view',
        'grading.view', 'grading.score',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
    },
    'DEPT_MANAGER': {
        'tag.view', 'tag.create', 'tag.update', 'tag.delete',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.analytics.view',
        'grading.view', 'grading.score',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
    },
    'TEAM_MANAGER': {'knowledge.view'},
    'ADMIN': {
        'user.avatar.update',
        'tag.view', 'tag.create', 'tag.update', 'tag.delete',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
    },
}

EXPECTED_ROLE_SYSTEM_DEFAULTS = {
    'STUDENT': {
        'profile.student.view', 'profile.student.update',
        'submission.answer', 'submission.review', 'dashboard.student.view',
    },
    'MENTOR': {'dashboard.mentor.view'},
    'DEPT_MANAGER': {'dashboard.mentor.view'},
    'TEAM_MANAGER': {'dashboard.team_manager.view'},
    'ADMIN': {'dashboard.admin.view'},
}

EXPECTED_SCOPE_RULES = {
    ('user.view', 'MENTOR', 'MENTEES'),
    ('user.view', 'DEPT_MANAGER', 'DEPARTMENT'),
    ('user.view', 'ADMIN', 'ALL'),
    *{
        (permission_code, role_code, scope_type)
        for permission_code in {
            'question.view', 'question.update', 'question.delete',
            'quiz.view', 'quiz.update', 'quiz.delete',
            'task.view', 'task.update', 'task.delete',
        }
        for role_code, scope_type in (
            ('MENTOR', 'SELF'),
            ('DEPT_MANAGER', 'SELF'),
            ('ADMIN', 'ALL'),
        )
    },
    ('task.view', 'STUDENT', 'SELF'),
    *{
        (permission_code, role_code, scope_type)
        for permission_code in {'task.assign', 'task.analytics.view'}
        for role_code, scope_type in (
            ('MENTOR', 'MENTEES'),
            ('DEPT_MANAGER', 'DEPARTMENT'),
            ('ADMIN', 'ALL'),
        )
    },
    ('spot_check.view', 'MENTOR', 'MENTEES'),
    ('spot_check.view', 'DEPT_MANAGER', 'DEPARTMENT'),
    ('spot_check.view', 'STUDENT', 'SELF'),
    ('spot_check.create', 'MENTOR', 'MENTEES'),
    ('spot_check.create', 'DEPT_MANAGER', 'DEPARTMENT'),
}


def normalize_role_map(role_map):
    return {role: set(codes) for role, codes in role_map.items()}


def test_every_permission_operation_is_reviewed():
    actual_codes = {item['code'] for item in PERMISSION_CATALOG}
    assert actual_codes == EXPECTED_PERMISSION_CODES


def test_system_managed_operations_are_reviewed():
    assert set(SYSTEM_MANAGED_PERMISSION_CODES) == EXPECTED_SYSTEM_MANAGED_PERMISSION_CODES


def test_default_role_capabilities_match_reviewed_contract():
    assert normalize_role_map(ROLE_PERMISSION_DEFAULTS) == EXPECTED_ROLE_DEFAULTS
    assert normalize_role_map(ROLE_SYSTEM_PERMISSION_DEFAULTS) == EXPECTED_ROLE_SYSTEM_DEFAULTS


def test_data_scope_rules_match_reviewed_contract():
    actual_rules = {
        (rule.permission_code, rule.role_code, rule.scope_type)
        for rule in PERMISSION_SCOPE_RULES
    }
    assert actual_rules == EXPECTED_SCOPE_RULES
