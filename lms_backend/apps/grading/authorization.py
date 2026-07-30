from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.registry import AuthorizationSpec, ResourceAuthorizationHandler, perm
from apps.tasks.models import Task


GRADING_CODES = ('grading.view', 'grading.score')
MEMBER_SUMMARY = '按当前角色人员范围'


def _authorize(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None
    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base
    if resource.assignments.filter(
        assignee_id__in=engine.get_scoped_learning_members().values('id')
    ).exists():
        return conditional_allow(permission_code, constraint='member_scope')
    return conditional_deny(
        permission_code,
        message=error_message or '该任务没有当前管理范围内的学员',
        reason='scope_denied',
        constraint='member_scope',
    )


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='grading.permissions',
        module='grading',
        permissions=(
            perm(
                code='grading.view',
                name='查看阅卷中心',
                description='查看待阅卷任务、题目分析和作答详情',
            ),
            perm(
                code='grading.score',
                name='提交评分',
                description='为主观题提交评分',
            ),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='grading.member_scope',
                permission_codes=GRADING_CODES,
                authorize=_authorize,
                constraint_summaries={
                    code: MEMBER_SUMMARY for code in GRADING_CODES
                },
            ),
        ),
    ),
)
