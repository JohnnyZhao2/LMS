"""
Admin configuration for knowledge app.
"""
from django.contrib import admin
from .models import KnowledgeCategory, Knowledge, OperationType


@admin.register(KnowledgeCategory)
class KnowledgeCategoryAdmin(admin.ModelAdmin):
    """知识分类管理"""
    list_display = ['name', 'code', 'level', 'parent', 'sort_order', 'created_at']
    list_filter = ['level', 'created_at']
    search_fields = ['name', 'code']
    ordering = ['level', 'sort_order', 'name']


@admin.register(OperationType)
class OperationTypeAdmin(admin.ModelAdmin):
    """操作类型管理"""
    list_display = ['name', 'code', 'sort_order', 'created_at']
    search_fields = ['name', 'code']
    ordering = ['sort_order', 'name']


@admin.register(Knowledge)
class KnowledgeAdmin(admin.ModelAdmin):
    """应急操作手册管理"""
    list_display = ['title', 'line', 'system', 'status', 'is_deleted', 'view_count', 'creator', 'created_at']
    list_filter = ['status', 'is_deleted', 'line', 'system', 'created_at']
    search_fields = ['title', 'content_scenario', 'content_solution']
    readonly_fields = ['view_count', 'created_at', 'updated_at', 'deleted_at']
    filter_horizontal = ['operation_types', 'executors']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'summary', 'cover_image', 'attachment_url')
        }),
        ('结构化内容', {
            'fields': ('content_scenario', 'content_trigger', 'content_solution', 
                      'content_verification', 'content_recovery')
        }),
        ('分类信息', {
            'fields': ('line', 'system', 'operation_types')
        }),
        ('人员信息', {
            'fields': ('deliverer', 'creator', 'creator_team', 'modifier', 'executors')
        }),
        ('其他信息', {
            'fields': ('emergency_platform', 'status', 'view_count', 'is_deleted')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """保存时自动设置创建人和修改人"""
        if not change:
            obj.creator = request.user
            if request.user.department:
                obj.creator_team = request.user.department
        obj.modifier = request.user
        super().save_model(request, obj, form, change)
