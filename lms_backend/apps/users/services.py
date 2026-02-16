"""
User services for LMS.
"""
from typing import List, Optional

from django.db import transaction
from django.db.models import Q

from apps.activity_logs.services import ActivityLogService
from core.base_service import BaseService
from core.decorators import log_user_action
from core.exceptions import BusinessError, ErrorCodes

from .models import Role, User, UserRole
from .role_constraints import validate_role_assignment_constraints
from .selectors import get_user_by_id


class UserManagementService(BaseService):
    """
    User management service.
    Provides methods for user CRUD operations, activation/deactivation,
    role assignment, and mentor assignment.
    """

    def _get_user(self, user_id: int) -> Optional[User]:
        return get_user_by_id(user_id)

    @log_user_action('deactivate', '管理员 {self.user.employee_id} 停用用户 {result.employee_id}')
    def deactivate_user(self, user_id: int) -> User:
        """
        Deactivate a user.
        Args:
            user_id: The user ID to deactivate
        Returns:
            The deactivated user
        Raises:
            BusinessError: If user not found or user is admin
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        # 防止停用超级用户（Django 的 is_superuser）
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能停用超级用户账号'
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return user

    @log_user_action('activate', '管理员 {self.user.employee_id} 启用用户 {result.employee_id}')
    def activate_user(self, user_id: int) -> User:
        """
        Activate a user.
        Args:
            user_id: The user ID to activate
        Returns:
            The activated user
        Raises:
            BusinessError: If user not found
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        user.is_active = True
        user.save(update_fields=['is_active'])
        return user

    def _validate_user_can_be_deleted(self, user: User) -> None:
        """校验用户是否允许被彻底删除。"""
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='不能删除超级用户账号'
            )

        # 仅允许删除离职用户（当前实现：停用用户）
        if user.is_active:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='仅可删除离职（已停用）用户，请先停用该账号'
            )

    def _purge_user_related_data(self, user: User) -> None:
        """
        清理用户的全部关联数据。
        注意：这里使用硬删除，不保留向后兼容。
        """
        from apps.knowledge.models import Knowledge
        from apps.questions.models import Question
        from apps.quizzes.models import Quiz, QuizQuestion
        from apps.spot_checks.models import SpotCheck
        from apps.submissions.models import Answer, Submission
        from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz

        created_task_ids = list(
            Task.objects.filter(created_by_id=user.id).values_list('id', flat=True)
        )
        created_knowledge_ids = list(
            Knowledge.objects.filter(created_by_id=user.id).values_list('id', flat=True)
        )
        created_quiz_ids = list(
            Quiz.objects.filter(created_by_id=user.id).values_list('id', flat=True)
        )
        created_question_ids = list(
            Question.objects.filter(created_by_id=user.id).values_list('id', flat=True)
        )

        # 1) 先清理直接挂在该用户上的业务数据（PROTECT 关系）
        SpotCheck.objects.filter(
            Q(student_id=user.id) | Q(checker_id=user.id)
        ).delete()
        TaskAssignment.objects.filter(assignee_id=user.id).delete()
        Submission.objects.filter(user_id=user.id).delete()

        # 2) 再清理该用户“创建”的资源依赖关系（避免 PROTECT 阻塞）
        if created_quiz_ids:
            Submission.objects.filter(quiz_id__in=created_quiz_ids).delete()
            TaskQuiz.objects.filter(quiz_id__in=created_quiz_ids).delete()

        if created_question_ids:
            Answer.objects.filter(question_id__in=created_question_ids).delete()
            QuizQuestion.objects.filter(question_id__in=created_question_ids).delete()

        if created_knowledge_ids:
            TaskKnowledge.objects.filter(knowledge_id__in=created_knowledge_ids).delete()

        # 3) 删除该用户创建的资源（硬删除）
        if created_task_ids:
            Task.objects.filter(id__in=created_task_ids).delete()
        if created_quiz_ids:
            Quiz.objects.filter(id__in=created_quiz_ids).delete()
        if created_knowledge_ids:
            Knowledge.objects.filter(id__in=created_knowledge_ids).delete()
        if created_question_ids:
            Question.objects.filter(id__in=created_question_ids).delete()

    def delete_user(self, user_id: int) -> None:
        """
        彻底删除用户及全部关联数据。
        仅允许删除离职（已停用）用户。
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        self._validate_user_can_be_deleted(user)

        with transaction.atomic():
            self._purge_user_related_data(user)
            user.delete()

    def assign_roles(self, user_id: int, role_codes: List[str], assigned_by: User) -> User:
        """
        Assign roles to a user.
        For non-superusers, STUDENT role is preserved only when user has
        no leadership role (ADMIN/DEPT_MANAGER/TEAM_MANAGER).
        Superuser accounts can only keep ADMIN role.
        Args:
            user_id: The user ID to assign roles to
            role_codes: List of role codes to assign (excluding STUDENT)
            assigned_by: The user performing the assignment
        Returns:
            The updated user
        Raises:
            BusinessError: If user not found or role constraints violated
        Properties:
        - Property 9: 管理角色与学员角色互斥（ADMIN/DEPT_MANAGER/TEAM_MANAGER）
        - 每个部门只能有一个室经理
        - 全局只能有一个团队经理
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')

        # 统一验证角色约束（专有角色组合、超级管理员限制、唯一性）
        validate_role_assignment_constraints(
            role_codes=role_codes,
            department_id=user.department_id,
            is_superuser=user.is_superuser,
            exclude_user_id=user.id,
        )

        leadership_roles = {'ADMIN', 'DEPT_MANAGER', 'TEAM_MANAGER'}
        should_keep_student = (
            not user.is_superuser
            and leadership_roles.isdisjoint(set(role_codes))
        )

        if should_keep_student:
            # 普通用户必须保留 STUDENT
            Role.objects.get_or_create(
                code='STUDENT',
                defaults={
                    'name': '学员',
                    'description': '系统默认角色'
                }
            )

        # Get all roles to assign
        roles_to_assign = set(role_codes)
        if should_keep_student:
            roles_to_assign.add('STUDENT')
        # Get current roles
        current_role_codes = set(user.roles.values_list('code', flat=True))
        # Remove roles that are not in the new list (except STUDENT)
        roles_to_remove = current_role_codes - roles_to_assign
        if should_keep_student and 'STUDENT' in roles_to_remove:
            roles_to_remove.remove('STUDENT')  # 普通用户永不移除 STUDENT
        # Add new roles
        roles_to_add = roles_to_assign - current_role_codes

        if not roles_to_add and not roles_to_remove:
            return user

        if roles_to_remove:
            UserRole.objects.filter(
                user_id=user.id,
                role__code__in=list(roles_to_remove)
            ).delete()
        for role_code in roles_to_add:
            role = Role.objects.filter(code=role_code).first()
            if not role:
                role_name = dict(Role.ROLE_CHOICES).get(role_code, role_code)
                role = Role.objects.create(
                    code=role_code,
                    name=role_name,
                    description=f'{role_name}角色'
                )
            if not user.roles.filter(code=role_code).exists():
                UserRole.objects.create(
                    user_id=user.id,
                    role_id=role.id,
                    assigned_by_id=assigned_by.id
                )
        # Refresh user from database
        user.refresh_from_db()

        # 记录用户日志（只记录实际变更）
        try:
            role_name_map = dict(Role.ROLE_CHOICES)
            added_names = ', '.join([role_name_map.get(code, code) for code in sorted(roles_to_add)])
            removed_names = ', '.join([role_name_map.get(code, code) for code in sorted(roles_to_remove)])
            if roles_to_add and roles_to_remove:
                description = (
                    f'管理员 {assigned_by.employee_id} 调整用户 {user.employee_id} 角色：'
                    f'新增 {added_names}；移除 {removed_names}'
                )
            elif roles_to_add:
                description = f'管理员 {assigned_by.employee_id} 为用户 {user.employee_id} 新增角色：{added_names}'
            else:
                description = f'管理员 {assigned_by.employee_id} 移除用户 {user.employee_id} 角色：{removed_names}'

            ActivityLogService.log_user_action(
                user=user,
                operator=assigned_by,
                action='role_assigned',
                description=description,
                status='success'
            )
        except Exception:
            pass  # 日志记录失败不影响主流程

        return user

    def assign_mentor(self, user_id: int, mentor_id: Optional[int]) -> User:
        """
        Assign a mentor to a user.
        Args:
            user_id: The user ID to assign mentor to
            mentor_id: The mentor user ID, or None to remove mentor
        Returns:
            The updated user
        Raises:
            BusinessError: If user or mentor not found, or mentor is invalid
        Properties:
        - Property 10: 师徒关系唯一性
        """
        user = self._get_user(user_id)
        self.validate_not_none(user, f'用户 {user_id} 不存在')
        if mentor_id is None:
            # Remove mentor binding
            user.mentor_id = None
            user.save(update_fields=['mentor'])
        else:
            # Validate mentor
            mentor = self._get_user(mentor_id)
            self.validate_not_none(mentor, f'导师 {mentor_id} 不存在')
            if not mentor.has_role('MENTOR'):
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='指定的用户不是导师'
                )
            if not mentor.is_active:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='指定的导师已被停用'
                )
            if mentor.pk == user.pk:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='不能将自己设为导师'
                )
            # Assign new mentor (automatically replaces old one due to FK)
            user.mentor_id = mentor_id
            user.save(update_fields=['mentor'])

        # 记录用户日志
        try:
            if mentor_id is None:
                description = f'管理员 {self.user.employee_id} 移除了用户 {user.employee_id} 的导师'
            else:
                mentor = self._get_user(mentor_id)
                description = f'管理员 {self.user.employee_id} 为学员 {user.employee_id} 分配了导师 {mentor.employee_id}'

            ActivityLogService.log_user_action(
                user=user,
                operator=self.user,
                action='mentor_assigned',
                description=description,
                status='success'
            )
        except Exception:
            pass  # 日志记录失败不影响主流程

        return user
