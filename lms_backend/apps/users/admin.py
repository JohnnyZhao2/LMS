"""
Admin configuration for User and Role models.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, UserRole, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'manager', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('created_at',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'real_name', 'employee_id', 'email', 'department', 'mentor', 'is_active')
    search_fields = ('username', 'real_name', 'employee_id', 'email')
    list_filter = ('is_active', 'is_staff', 'department', 'join_date')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('额外信息', {'fields': ('real_name', 'employee_id', 'phone', 'department', 'mentor', 'join_date')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('额外信息', {'fields': ('real_name', 'employee_id', 'phone', 'department', 'mentor', 'join_date')}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('created_at',)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'assigned_by', 'assigned_at')
    search_fields = ('user__username', 'role__name')
    list_filter = ('role', 'assigned_at')
    raw_id_fields = ('user', 'assigned_by')
