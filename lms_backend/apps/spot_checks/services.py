"""
抽查记录应用服务
编排业务逻辑，处理抽查记录的创建、更新、删除和权限验证。
Properties: 35, 36

使用方式（构造器注入）:
    service = SpotCheckService(request)
    records = service.get_list(student_id=123)
"""
from typing import Optional, List
from django.utils import timezone
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.users.models import User
from apps.users.permissions import get_accessible_students
from .models import SpotCheck


class SpotCheckService(BaseService):
    """
    抽查记录应用服务
    
    通过构造器注入 request，内部通过 self.user 和 self.get_current_role() 访问。
    """

    def _with_relations(self, qs):
        return qs.select_related('student', 'checker', 'student__department')

    def get_by_id(self, pk: int) -> SpotCheck:
        """
        获取抽查记录详情
        
        Args:
            pk: 主键
        Returns:
            抽查记录对象
        Raises:
            BusinessError: 如果不存在或无权限
        """
        spot_check = self._with_relations(SpotCheck.objects).filter(pk=pk).first()
        self.validate_not_none(spot_check, f'抽查记录 {pk} 不存在')
        # 验证数据权限
        self._validate_data_scope_access(spot_check)
        return spot_check

    def get_list(
        self,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> List[SpotCheck]:
        """
        获取抽查记录列表（根据用户权限范围）
        
        Args:
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
        Returns:
            抽查记录列表
        Property 36: 抽查记录时间排序
        """
        qs = self._get_queryset_for_user(student_id, ordering)
        return list(qs)

    def create(self, data: dict) -> SpotCheck:
        """
        创建抽查记录
        
        Args:
            data: 抽查记录数据
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
        
        self._validate_student_scope(student)
        
        # 2. 验证抽查时间
        self._validate_checked_at(data.get('checked_at'))
        
        # 3. 准备数据
        data['student'] = student
        data['checker'] = self.user
        
        # 4. 创建记录
        return SpotCheck.objects.create(**data)

    def update(self, pk: int, data: dict) -> SpotCheck:
        """
        更新抽查记录
        
        Args:
            pk: 主键
            data: 更新数据
        Returns:
            更新后的抽查记录对象
        Raises:
            BusinessError: 如果验证失败或权限不足
        """
        spot_check = self.get_by_id(pk)
        
        # 验证更新权限：只能更新自己创建的记录（管理员除外）
        if self.get_current_role() != 'ADMIN' and spot_check.checker_id != self.user.id:
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

    def delete(self, pk: int) -> None:
        """
        删除抽查记录
        
        Args:
            pk: 主键
        Raises:
            BusinessError: 如果权限不足
        """
        spot_check = self.get_by_id(pk)
        
        # 验证删除权限：只能删除自己创建的记录（管理员除外）
        if self.get_current_role() != 'ADMIN' and spot_check.checker_id != self.user.id:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只能删除自己创建的抽查记录'
            )
        
        # 删除记录（硬删除）
        spot_check.delete()

    def _get_queryset_for_user(
        self,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ):
        """
        根据用户角色获取相应范围的查询集
        """
        current_role = self.get_current_role()
        
        if current_role == 'ADMIN':
            qs = SpotCheck.objects.all()
        elif current_role == 'MENTOR':
            qs = SpotCheck.objects.filter(student__mentor_id=self.user.id)
        elif current_role == 'DEPT_MANAGER':
            if not self.user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='您未分配部门，无法查看抽查记录'
                )
            qs = SpotCheck.objects.filter(student__department_id=self.user.department_id)
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问抽查记录'
            )
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        if ordering:
            qs = qs.order_by(ordering)
        
        return self._with_relations(qs)

    def _validate_data_scope_access(self, spot_check: SpotCheck) -> None:
        """验证用户是否有权限访问该抽查记录"""
        if not get_accessible_students(self.user, request=self.request).filter(pk=spot_check.student_id).exists():
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该抽查记录'
            )

    def _validate_checked_at(self, checked_at) -> None:
        """验证抽查时间"""
        if checked_at and checked_at > timezone.now():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='抽查时间不能是未来时间'
            )

    def _validate_student_scope(self, student: User) -> None:
        """
        验证用户是否有权限为指定学员创建抽查记录
        Property 35: 抽查学员范围限制
        """
        if not get_accessible_students(self.user, request=self.request).filter(pk=student.id).exists():
            current_role = self.get_current_role()
            
            if current_role == 'DEPT_MANAGER' and not self.user.department_id:
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
