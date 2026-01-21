"""
抽查记录应用服务
编排业务逻辑，处理抽查记录的创建、更新、删除和权限验证。
Properties: 35, 36
"""
from typing import Optional, List
from django.utils import timezone
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.users.models import User
from apps.users.permissions import get_current_role, get_accessible_students
from .models import SpotCheck
class SpotCheckService(BaseService):
    """抽查记录应用服务"""

    def _with_relations(self, qs):
        return qs.select_related('student', 'checker', 'student__department')
    def get_by_id(self, pk: int, user: User, request=None) -> SpotCheck:
        """
        获取抽查记录详情
        Args:
            pk: 主键
            user: 当前用户（用于权限验证）
            request: HTTP请求对象（用于从Header读取当前角色）
        Returns:
            抽查记录对象
        Raises:
            BusinessError: 如果不存在或无权限
        """
        spot_check = self._with_relations(SpotCheck.objects).filter(pk=pk).first()
        self.validate_not_none(
            spot_check,
            f'抽查记录 {pk} 不存在'
        )
        # 验证数据权限
        self._validate_data_scope_access(spot_check, user, request)
        return spot_check
    def get_list(
        self,
        user: User,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at',
        request=None
    ) -> List[SpotCheck]:
        """
        获取抽查记录列表（根据用户权限范围）
        Args:
            user: 当前用户
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            request: HTTP请求对象（用于从Header读取当前角色）
        Returns:
            抽查记录列表
        Property 36: 抽查记录时间排序
        """
        # 根据用户角色获取相应范围的查询集
        qs = self._get_queryset_for_user(user, student_id, ordering, request)
        return list(qs)
    def create(
        self,
        data: dict,
        user: User,
        request=None
    ) -> SpotCheck:
        """
        创建抽查记录
        Args:
            data: 抽查记录数据
            user: 创建用户
            request: HTTP请求对象（用于从Header读取当前角色）
        Returns:
            创建的抽查记录对象
        Raises:
            BusinessError: 如果验证失败或权限不足
        Property 35: 抽查学员范围限制
        """
        # 1. 验证学员范围权限
        student = data.get('student')
        if not student:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='必须指定被抽查学员'
            )
        # 如果传入的是 ID，需要获取用户对象
        if isinstance(student, int):
            student = User.objects.filter(pk=student).first()
            self.validate_not_none(student, f'学员 {data.get("student")} 不存在')
        if not isinstance(student, User):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的学员数据'
            )
        self._validate_student_scope(student, user, request)
        # 2. 验证抽查时间
        self._validate_checked_at(data.get('checked_at'))
        # 3. 准备数据
        data['student'] = student
        data['checker'] = user
        # 4. 创建记录
        return SpotCheck.objects.create(**data)
    def update(
        self,
        pk: int,
        data: dict,
        user: User,
        request=None
    ) -> SpotCheck:
        """
        更新抽查记录
        Args:
            pk: 主键
            data: 更新数据
            user: 更新用户
            request: HTTP请求对象（用于从Header读取当前角色）
        Returns:
            更新后的抽查记录对象
        Raises:
            BusinessError: 如果验证失败或权限不足
        """
        spot_check = self.get_by_id(pk, user, request)
        # 验证更新权限：只能更新自己创建的记录（管理员除外）
        current_role = get_current_role(user, request)
        if current_role != 'ADMIN' and spot_check.checker_id != user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能更新自己创建的抽查记录'
            )
        # 验证抽查时间
        self._validate_checked_at(data.get('checked_at'))
        # 不允许修改 student 和 checker
        data.pop('student', None)
        data.pop('student_id', None)
        data.pop('checker', None)
        data.pop('checker_id', None)
        # 更新记录
        if data:
            for key, value in data.items():
                setattr(spot_check, key, value)
            spot_check.save(update_fields=list(data.keys()))
        return spot_check
    def delete(
        self,
        pk: int,
        user: User,
        request=None
    ) -> None:
        """
        删除抽查记录
        Args:
            pk: 主键
            user: 删除用户
            request: HTTP请求对象（用于从Header读取当前角色）
        Raises:
            BusinessError: 如果权限不足
        """
        spot_check = self.get_by_id(pk, user, request)
        # 验证删除权限：只能删除自己创建的记录（管理员除外）
        current_role = get_current_role(user, request)
        if current_role != 'ADMIN' and spot_check.checker_id != user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能删除自己创建的抽查记录'
            )
        # 删除记录（硬删除）
        spot_check.delete()
    def _get_queryset_for_user(
        self,
        user: User,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at',
        request=None
    ):
        """
        根据用户角色获取相应范围的查询集
        Args:
            user: 当前用户
            student_id: 可选的学生 ID
            ordering: 排序字段
            request: HTTP请求对象（用于从Header读取当前角色）
        Returns:
            QuerySet
        """
        current_role = get_current_role(user, request)
        if current_role == 'ADMIN':
            qs = SpotCheck.objects.all()
        elif current_role == 'MENTOR':
            qs = SpotCheck.objects.filter(student__mentor_id=user.id)
        elif current_role == 'DEPT_MANAGER':
            # 室经理只能看到本室学员的记录
            if not user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='您未分配部门，无法查看抽查记录'
                )
            qs = SpotCheck.objects.filter(student__department_id=user.department_id)
        else:
            # 其他角色无权访问
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问抽查记录'
            )
        if student_id:
            qs = qs.filter(student_id=student_id)
        if ordering:
            qs = qs.order_by(ordering)
        return self._with_relations(qs)
    def _validate_data_scope_access(self, spot_check: SpotCheck, user: User, request=None) -> None:
        """
        验证用户是否有权限访问该抽查记录
        Args:
            spot_check: 抽查记录对象
            user: 当前用户
            request: HTTP请求对象（用于从Header读取当前角色）
        Raises:
            BusinessError: 如果权限不足
        """
        if not get_accessible_students(user, request=request).filter(pk=spot_check.student_id).exists():
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该抽查记录'
            )
    def _validate_checked_at(self, checked_at) -> None:
        """
        验证抽查时间
        Args:
            checked_at: 抽查时间
        Raises:
            BusinessError: 如果时间为未来时间
        """
        if checked_at and checked_at > timezone.now():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查时间不能是未来时间'
            )
    def _validate_student_scope(self, student: User, user: User, request=None) -> None:
        """
        验证用户是否有权限为指定学员创建抽查记录
        Args:
            student: 被抽查学员
            user: 当前用户
            request: HTTP请求对象（用于从Header读取当前角色）
        Raises:
            BusinessError: 如果权限不足
        Property 35: 抽查学员范围限制
        """
        if not get_accessible_students(user, request=request).filter(pk=student.id).exists():
            current_role = get_current_role(user, request)
            # 根据角色提供更具体的错误消息
            if current_role == 'DEPT_MANAGER' and not user.department_id:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='您未分配部门，无法创建抽查记录'
                )
            elif current_role == 'MENTOR':
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='只能为名下学员创建抽查记录'
                )
            elif current_role == 'DEPT_MANAGER':
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='只能为本室学员创建抽查记录'
                )
            else:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权创建抽查记录'
                )
