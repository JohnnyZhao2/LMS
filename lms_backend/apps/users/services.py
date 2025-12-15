"""
Authentication and user services for LMS.

Implements:
- Login/logout logic
- JWT token generation and validation
- Role switching
- Inactive user login rejection

Requirements: 1.1, 1.2, 1.3, 1.5
"""
from typing import Optional, Dict, Any, List
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from core.exceptions import BusinessError, ErrorCodes
from .models import User, Role


class AuthenticationService:
    """
    Authentication service handling login, logout, and role switching.
    
    Requirements:
    - 1.1: Validate credentials and create user session
    - 1.2: Return all available roles on login
    - 1.3: Role switching with permission refresh
    - 1.5: Reject login for inactive users
    """
    
    @staticmethod
    def login(username: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user and generate JWT tokens.
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Dict containing tokens, user info, and available roles
            
        Raises:
            BusinessError: If credentials are invalid or user is inactive
            
        Requirements:
        - 1.1: WHEN 用户提交有效的登录凭证 THEN LMS SHALL 验证凭证并创建用户会话
        - 1.2: WHEN 用户登录成功 THEN LMS SHALL 返回用户的所有可用角色列表
        - 1.5: IF 用户账号被停用 THEN LMS SHALL 拒绝登录请求并返回明确的错误信息
        
        Properties:
        - Property 1: 有效凭证登录成功
        - Property 2: 登录返回完整角色列表
        - Property 3: 停用用户登录拒绝
        """
        # First, check if user exists and is active (Property 3)
        # We need to do this separately because Django's authenticate()
        # returns None for both invalid credentials AND inactive users
        try:
            user_obj = User.objects.get(username=username)
            if not user_obj.is_active:
                raise BusinessError(
                    code=ErrorCodes.AUTH_USER_INACTIVE,
                    message='用户账号已被停用'
                )
        except User.DoesNotExist:
            # User doesn't exist - will be caught by authenticate below
            pass
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='用户名或密码错误'
            )
        
        # Generate JWT tokens
        tokens = AuthenticationService._generate_tokens(user)
        
        # Get available roles (Property 2)
        available_roles = AuthenticationService._get_user_roles(user)
        
        # Determine default/current role (highest privilege role)
        current_role = AuthenticationService._get_default_role(available_roles)
        
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            'user': AuthenticationService._get_user_info(user),
            'available_roles': available_roles,
            'current_role': current_role,
        }
    
    @staticmethod
    def logout(user: User, refresh_token: Optional[str] = None) -> bool:
        """
        Logout user by blacklisting their refresh token.
        
        Args:
            user: The user to logout
            refresh_token: Optional refresh token to blacklist
            
        Returns:
            True if logout successful
        """
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token might already be blacklisted or invalid
                pass
        return True
    
    @staticmethod
    def refresh_token(refresh_token: str) -> Dict[str, str]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dict containing new access and refresh tokens
            
        Raises:
            BusinessError: If refresh token is invalid
        """
        try:
            token = RefreshToken(refresh_token)
            return {
                'access_token': str(token.access_token),
                'refresh_token': str(token),
            }
        except Exception as e:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='无效的刷新令牌'
            )
    
    @staticmethod
    def switch_role(user: User, role_code: str) -> Dict[str, Any]:
        """
        Switch user's current active role.
        
        Args:
            user: The user switching roles
            role_code: The role code to switch to
            
        Returns:
            Dict containing new tokens and updated role info
            
        Raises:
            BusinessError: If user doesn't have the requested role
            
        Requirements:
        - 1.3: WHEN 高权限用户切换角色 THEN LMS SHALL 实时刷新菜单、路由和接口权限
        - 1.4: WHEN 用户切换角色 THEN LMS SHALL 清除前一角色的所有状态数据
        
        Properties:
        - Property 4: 角色切换权限生效
        """
        # Verify user has the requested role
        if not user.has_role(role_code):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_ROLE,
                message=f'用户没有 {role_code} 角色权限'
            )
        
        # Generate new tokens with role claim
        tokens = AuthenticationService._generate_tokens(user, current_role=role_code)
        
        # Get available roles
        available_roles = AuthenticationService._get_user_roles(user)
        
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            'user': AuthenticationService._get_user_info(user),
            'available_roles': available_roles,
            'current_role': role_code,
        }
    
    @staticmethod
    def _generate_tokens(user: User, current_role: Optional[str] = None) -> Dict[str, str]:
        """
        Generate JWT tokens for user.
        
        Args:
            user: The user to generate tokens for
            current_role: Optional current role to include in token
            
        Returns:
            Dict containing access and refresh tokens
        """
        refresh = RefreshToken.for_user(user)
        
        # Add custom claims
        refresh['employee_id'] = user.employee_id
        refresh['real_name'] = user.real_name
        refresh['roles'] = user.role_codes
        
        if current_role:
            refresh['current_role'] = current_role
        else:
            # Set default role
            refresh['current_role'] = AuthenticationService._get_default_role(
                AuthenticationService._get_user_roles(user)
            )
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    
    @staticmethod
    def _get_user_roles(user: User) -> List[Dict[str, str]]:
        """
        Get all roles for a user.
        
        Args:
            user: The user to get roles for
            
        Returns:
            List of role dicts with code and name
        """
        return [
            {'code': role.code, 'name': role.name}
            for role in user.roles.all()
        ]
    
    @staticmethod
    def _get_default_role(roles: List[Dict[str, str]]) -> str:
        """
        Determine the default role for a user based on role priority.
        
        Priority order (highest to lowest):
        1. ADMIN
        2. DEPT_MANAGER
        3. MENTOR
        4. TEAM_MANAGER
        5. STUDENT
        
        Args:
            roles: List of role dicts
            
        Returns:
            The highest priority role code
        """
        priority_order = ['ADMIN', 'DEPT_MANAGER', 'MENTOR', 'TEAM_MANAGER', 'STUDENT']
        role_codes = {r['code'] for r in roles}
        
        for role in priority_order:
            if role in role_codes:
                return role
        
        # Fallback to STUDENT if no roles found (shouldn't happen)
        return 'STUDENT'
    
    @staticmethod
    def _get_user_info(user: User) -> Dict[str, Any]:
        """
        Get user information for response.
        
        Args:
            user: The user to get info for
            
        Returns:
            Dict containing user information
        """
        return {
            'id': user.id,
            'username': user.username,
            'employee_id': user.employee_id,
            'real_name': user.real_name,
            'email': user.email,
            'department': {
                'id': user.department.id,
                'name': user.department.name,
                'code': user.department.code,
            } if user.department else None,
            'mentor': {
                'id': user.mentor.id,
                'real_name': user.mentor.real_name,
                'employee_id': user.mentor.employee_id,
            } if user.mentor else None,
            'is_active': user.is_active,
        }


class UserService:
    """
    User management service.
    
    Provides utility methods for user-related operations.
    """
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: The user ID
            
        Returns:
            User instance or None
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[User]:
        """
        Get user by username.
        
        Args:
            username: The username
            
        Returns:
            User instance or None
        """
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return None
    
    @staticmethod
    def get_user_by_employee_id(employee_id: str) -> Optional[User]:
        """
        Get user by employee ID.
        
        Args:
            employee_id: The employee ID
            
        Returns:
            User instance or None
        """
        try:
            return User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return None
    
    @staticmethod
    def validate_user_can_login(user: User) -> bool:
        """
        Validate if a user can login.
        
        Args:
            user: The user to validate
            
        Returns:
            True if user can login
            
        Raises:
            BusinessError: If user cannot login
        """
        if not user.is_active:
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用'
            )
        return True



class UserManagementService:
    """
    User management service.
    
    Provides methods for user CRUD operations, activation/deactivation,
    role assignment, and mentor assignment.
    
    Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6
    """
    
    @staticmethod
    def deactivate_user(user_id: int) -> User:
        """
        Deactivate a user.
        
        Args:
            user_id: The user ID to deactivate
            
        Returns:
            The deactivated user
            
        Raises:
            BusinessError: If user not found
            
        Requirements:
        - 2.3: 停用用户，该用户无法登录且不出现在人员选择器中
        
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        
        user.is_active = False
        user.save()
        return user
    
    @staticmethod
    def activate_user(user_id: int) -> User:
        """
        Activate a user.
        
        Args:
            user_id: The user ID to activate
            
        Returns:
            The activated user
            
        Raises:
            BusinessError: If user not found
            
        Requirements:
        - 2.4: 启用已停用用户，恢复登录能力和选择器可见性
        
        Properties:
        - Property 7: 用户停用/启用状态切换
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        
        user.is_active = True
        user.save()
        return user
    
    @staticmethod
    def assign_roles(user_id: int, role_codes: List[str], assigned_by: User) -> User:
        """
        Assign roles to a user.
        
        The STUDENT role is always preserved and cannot be removed.
        
        Args:
            user_id: The user ID to assign roles to
            role_codes: List of role codes to assign (excluding STUDENT)
            assigned_by: The user performing the assignment
            
        Returns:
            The updated user
            
        Raises:
            BusinessError: If user not found
            
        Requirements:
        - 2.6: 在保留默认学员角色的基础上附加其他角色
        
        Properties:
        - Property 9: 学员角色不可移除
        """
        from .models import UserRole
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        
        # Get student role (must always be preserved)
        student_role = Role.objects.get(code='STUDENT')
        
        # Get all roles to assign (including STUDENT)
        roles_to_assign = set(role_codes)
        roles_to_assign.add('STUDENT')  # Always include STUDENT
        
        # Get current roles
        current_role_codes = set(user.roles.values_list('code', flat=True))
        
        # Remove roles that are not in the new list (except STUDENT)
        roles_to_remove = current_role_codes - roles_to_assign
        if 'STUDENT' in roles_to_remove:
            roles_to_remove.remove('STUDENT')  # Never remove STUDENT
        
        for role_code in roles_to_remove:
            UserRole.objects.filter(user=user, role__code=role_code).delete()
        
        # Add new roles
        roles_to_add = roles_to_assign - current_role_codes
        for role_code in roles_to_add:
            # Get or create the role
            role_name = dict(Role.ROLE_CHOICES).get(role_code, role_code)
            role, _ = Role.objects.get_or_create(
                code=role_code,
                defaults={'name': role_name, 'description': f'{role_name}角色'}
            )
            UserRole.objects.get_or_create(
                user=user,
                role=role,
                defaults={'assigned_by': assigned_by}
            )
        
        # Refresh user from database
        user.refresh_from_db()
        return user
    
    @staticmethod
    def assign_mentor(user_id: int, mentor_id: Optional[int]) -> User:
        """
        Assign a mentor to a user.
        
        Args:
            user_id: The user ID to assign mentor to
            mentor_id: The mentor user ID, or None to remove mentor
            
        Returns:
            The updated user
            
        Raises:
            BusinessError: If user or mentor not found, or mentor is invalid
            
        Requirements:
        - 3.4: 为学员指定导师建立师徒绑定关系
        - 3.5: 解除师徒关系时传入 null
        - 3.6: 一个学员同时只能绑定一个导师（自动解除原有绑定）
        
        Properties:
        - Property 10: 师徒关系唯一性
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        
        if mentor_id is None:
            # Remove mentor binding
            user.mentor = None
        else:
            # Validate mentor
            try:
                mentor = User.objects.get(pk=mentor_id)
            except User.DoesNotExist:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message='导师不存在'
                )
            
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
            user.mentor = mentor
        
        user.save()
        return user
    
    @staticmethod
    def can_delete_user(user_id: int) -> bool:
        """
        Check if a user can be deleted.
        
        A user cannot be deleted if they have associated data:
        - TaskAssignment records
        - Submission records
        - SpotCheck records
        
        Args:
            user_id: The user ID to check
            
        Returns:
            True if user can be deleted, False otherwise
            
        Requirements:
        - 2.5: 用户已产生学习/任务/考试数据时禁止删除
        
        Properties:
        - Property 8: 有数据用户删除保护
        """
        # Import here to avoid circular imports
        # These models will be implemented in later tasks
        # For now, we'll check if the models exist
        try:
            from apps.tasks.models import TaskAssignment
            if TaskAssignment.objects.filter(assignee_id=user_id).exists():
                return False
        except ImportError:
            pass
        
        try:
            from apps.submissions.models import Submission
            if Submission.objects.filter(user_id=user_id).exists():
                return False
        except ImportError:
            pass
        
        try:
            from apps.spot_checks.models import SpotCheck
            if SpotCheck.objects.filter(student_id=user_id).exists():
                return False
        except ImportError:
            pass
        
        return True
    
    @staticmethod
    def delete_user(user_id: int) -> bool:
        """
        Delete a user if allowed.
        
        Args:
            user_id: The user ID to delete
            
        Returns:
            True if deleted successfully
            
        Raises:
            BusinessError: If user not found or has associated data
            
        Requirements:
        - 2.5: 用户已产生学习/任务/考试数据时禁止删除，仅允许停用
        
        Properties:
        - Property 8: 有数据用户删除保护
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        
        if not UserManagementService.can_delete_user(user_id):
            raise BusinessError(
                code=ErrorCodes.USER_HAS_DATA,
                message='用户已产生关联数据，无法删除，请使用停用功能'
            )
        
        user.delete()
        return True
