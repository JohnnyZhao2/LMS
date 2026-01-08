"""
抽查记录应用服务

编排业务逻辑，协调 Repository 和 Domain Service。
处理抽查记录的创建、更新、删除和权限验证。

Requirements: 14.1, 14.2, 14.3, 14.4
Properties: 35, 36
"""
from typing import Optional, List
from django.db import transaction
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.users.models import User
from apps.users.permissions import get_current_role, filter_queryset_by_data_scope, is_student_in_scope
from apps.users.repositories import UserRepository
from .models import SpotCheck
from .repositories import SpotCheckRepository


class SpotCheckService(BaseService):
    """抽查记录应用服务"""
    
    def __init__(self, user_repository: UserRepository = None):
        self.repository = SpotCheckRepository()
        self.user_repository = user_repository or UserRepository()
    
    def get_by_id(self, pk: int, user: User) -> SpotCheck:
        """
        获取抽查记录详情
        
        Args:
            pk: 主键
            user: 当前用户（用于权限验证）
            
        Returns:
            抽查记录对象
            
        Raises:
            BusinessError: 如果不存在或无权限
        """
        spot_check = self.repository.get_by_id(pk)
        self.validate_not_none(
            spot_check,
            f'抽查记录 {pk} 不存在'
        )
        
        # 验证数据权限
        self._validate_data_scope_access(spot_check, user)
        
        return spot_check
    
    def get_list(
        self,
        user: User,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> List[SpotCheck]:
        """
        获取抽查记录列表（根据用户权限范围）
        
        Args:
            user: 当前用户
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            
        Returns:
            抽查记录列表
            
        Requirements: 14.4
        Property 36: 抽查记录时间排序
        """
        # 根据用户角色获取相应范围的查询集
        qs = self._get_queryset_for_user(user, student_id, ordering)
        
        return list(qs)
    
    def create(
        self,
        data: dict,
        user: User
    ) -> SpotCheck:
        """
        创建抽查记录
        
        Args:
            data: 抽查记录数据
            user: 创建用户
            
        Returns:
            创建的抽查记录对象
            
        Raises:
            BusinessError: 如果验证失败或权限不足
            
        Requirements: 14.1, 14.2, 14.3
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
            student = self.user_repository.get_by_id(student)
            self.validate_not_none(student, f'学员 {data.get("student")} 不存在')
        
        if not isinstance(student, User):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的学员数据'
            )
        
        self._validate_student_scope(student, user)
        
        # 2. 验证抽查时间
        self._validate_checked_at(data.get('checked_at'))
        
        # 3. 准备数据
        data['student'] = student
        
        data['checker'] = user
        
        # 4. 创建记录
        spot_check = self.repository.create(**data)
        
        return spot_check
    
    def update(
        self,
        pk: int,
        data: dict,
        user: User
    ) -> SpotCheck:
        """
        更新抽查记录
        
        Args:
            pk: 主键
            data: 更新数据
            user: 更新用户
            
        Returns:
            更新后的抽查记录对象
            
        Raises:
            BusinessError: 如果验证失败或权限不足
        """
        spot_check = self.get_by_id(pk, user)
        
        # 验证更新权限：只能更新自己创建的记录（管理员除外）
        current_role = get_current_role(user)
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
        spot_check = self.repository.update(spot_check, **data)
        
        return spot_check
    
    def delete(
        self,
        pk: int,
        user: User
    ) -> None:
        """
        删除抽查记录
        
        Args:
            pk: 主键
            user: 删除用户
            
        Raises:
            BusinessError: 如果权限不足
        """
        spot_check = self.get_by_id(pk, user)
        
        # 验证删除权限：只能删除自己创建的记录（管理员除外）
        current_role = get_current_role(user)
        if current_role != 'ADMIN' and spot_check.checker_id != user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能删除自己创建的抽查记录'
            )
        
        # 删除记录（硬删除）
        self.repository.delete(spot_check, soft=False)
    
    def _get_queryset_for_user(
        self,
        user: User,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ):
        """
        根据用户角色获取相应范围的查询集
        
        Args:
            user: 当前用户
            student_id: 可选的学生 ID
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            # 管理员可以看到所有记录
            qs = self.repository.get_all_for_admin(
                student_id=student_id,
                ordering=ordering
            )
        elif current_role == 'MENTOR':
            # 导师只能看到名下学员的记录
            qs = self.repository.get_for_mentor_mentees(
                mentor_id=user.id,
                student_id=student_id,
                ordering=ordering
            )
        elif current_role == 'DEPT_MANAGER':
            # 室经理只能看到本室学员的记录
            if not user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='您未分配部门，无法查看抽查记录'
                )
            qs = self.repository.get_for_department(
                department_id=user.department_id,
                student_id=student_id,
                ordering=ordering
            )
        else:
            # 其他角色无权访问
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问抽查记录'
            )
        
        # 应用排序
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs.select_related('student', 'checker', 'student__department')
    
    def _validate_data_scope_access(self, spot_check: SpotCheck, user: User) -> None:
        """
        验证用户是否有权限访问该抽查记录
        
        Args:
            spot_check: 抽查记录对象
            user: 当前用户
            
        Raises:
            BusinessError: 如果权限不足
        """
        if not is_student_in_scope(user, spot_check.student_id):
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
    
    def _validate_student_scope(self, student: User, user: User) -> None:
        """
        验证用户是否有权限为指定学员创建抽查记录
        
        Args:
            student: 被抽查学员
            user: 当前用户
            
        Raises:
            BusinessError: 如果权限不足
            
        Requirements: 14.2, 14.3
        Property 35: 抽查学员范围限制
        """
        if not is_student_in_scope(user, student.id):
            current_role = get_current_role(user)
            
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
