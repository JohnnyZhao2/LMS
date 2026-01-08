"""
用户相关仓储实现

负责所有用户、角色、部门相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q

from core.base_repository import BaseRepository
from .models import User, Role, Department, UserRole


class UserRepository(BaseRepository[User]):
    """用户仓储"""
    
    model = User
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[User]:
        """
        根据 ID 获取用户
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录（User 模型没有软删除，此参数暂不使用）
            
        Returns:
            用户对象或 None
        """
        qs = self.model.objects.select_related(
            'department',
            'mentor'
        ).prefetch_related('roles')
        
        return qs.filter(pk=pk).first()
    
    def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        """
        根据工号获取用户
        
        Args:
            employee_id: 工号
            
        Returns:
            用户对象或 None
        """
        try:
            return self.model.objects.select_related(
                'department',
                'mentor'
            ).prefetch_related('roles').get(employee_id=employee_id)
        except self.model.DoesNotExist:
            return None
    
    def has_role(self, user_id: int, role_code: str) -> bool:
        """
        检查用户是否拥有指定角色
        
        Args:
            user_id: 用户 ID
            role_code: 角色代码
            
        Returns:
            True 如果用户拥有该角色
        """
        return self.model.objects.filter(
            pk=user_id,
            roles__code=role_code
        ).exists()


class RoleRepository(BaseRepository[Role]):
    """角色仓储"""
    
    model = Role
    
    def get_by_code(self, code: str) -> Optional[Role]:
        """
        根据代码获取角色
        
        Args:
            code: 角色代码
            
        Returns:
            角色对象或 None
        """
        try:
            return self.model.objects.get(code=code)
        except self.model.DoesNotExist:
            return None
    
    def get_all(self, exclude_codes: List[str] = None) -> QuerySet[Role]:
        """
        获取所有角色
        
        Args:
            exclude_codes: 要排除的角色代码列表
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.all()
        if exclude_codes:
            qs = qs.exclude(code__in=exclude_codes)
        return qs.order_by('code')
    
    def get_or_create_student_role(self) -> Role:
        """
        获取或创建学员角色（系统默认角色）
        
        Returns:
            学员角色对象
        """
        role, _ = self.model.objects.get_or_create(
            code='STUDENT',
            defaults={
                'name': '学员',
                'description': '系统默认角色'
            }
        )
        return role


class DepartmentRepository(BaseRepository[Department]):
    """部门仓储"""
    
    model = Department
    
    def get_all(self, ordering: str = 'code') -> QuerySet[Department]:
        """
        获取所有部门
        
        Args:
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        return self.model.objects.all().order_by(ordering)
    
    def get_by_code(self, code: str) -> Optional[Department]:
        """
        根据代码获取部门
        
        Args:
            code: 部门代码
            
        Returns:
            部门对象或 None
        """
        try:
            return self.model.objects.get(code=code)
        except self.model.DoesNotExist:
            return None


class UserRoleRepository(BaseRepository[UserRole]):
    """用户角色关联仓储"""
    
    model = UserRole
    
    def get_user_roles(self, user_id: int) -> QuerySet[UserRole]:
        """
        获取用户的所有角色关联
        
        Args:
            user_id: 用户 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            user_id=user_id
        ).select_related('role', 'assigned_by')
    
    def user_has_role(self, user_id: int, role_code: str) -> bool:
        """
        检查用户是否拥有指定角色
        
        Args:
            user_id: 用户 ID
            role_code: 角色代码
            
        Returns:
            True 如果用户拥有该角色
        """
        return self.model.objects.filter(
            user_id=user_id,
            role__code=role_code
        ).exists()
    
    def create_user_role(
        self,
        user_id: int,
        role_id: int,
        assigned_by_id: Optional[int] = None
    ) -> UserRole:
        """
        创建用户角色关联
        
        Args:
            user_id: 用户 ID
            role_id: 角色 ID
            assigned_by_id: 分配者用户 ID（可选）
            
        Returns:
            创建的 UserRole 对象
        """
        return self.model.objects.create(
            user_id=user_id,
            role_id=role_id,
            assigned_by_id=assigned_by_id
        )
    
    def remove_user_role(self, user_id: int, role_code: str) -> None:
        """
        移除用户的指定角色（学员角色除外）
        
        Args:
            user_id: 用户 ID
            role_code: 角色代码
            
        Raises:
            ValueError: 如果尝试移除学员角色
        """
        if role_code == 'STUDENT':
            raise ValueError('学员角色不可移除')
        
        self.model.objects.filter(
            user_id=user_id,
            role__code=role_code
        ).delete()
