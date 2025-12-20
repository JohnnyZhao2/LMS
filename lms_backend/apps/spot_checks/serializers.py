"""
Serializers for spot check management.

Requirements: 14.1, 14.2, 14.3, 14.4
Properties: 35, 36
"""
from rest_framework import serializers
from django.utils import timezone

from apps.users.models import User
from .models import SpotCheck


class SpotCheckListSerializer(serializers.ModelSerializer):
    """
    Serializer for spot check list view.
    
    Requirements: 14.4
    Property 36: 抽查记录时间排序
    """
    student_name = serializers.CharField(source='student.username', read_only=True)
    student_employee_id = serializers.CharField(source='student.employee_id', read_only=True)
    checker_name = serializers.CharField(source='checker.username', read_only=True)
    
    class Meta:
        model = SpotCheck
        fields = [
            'id', 'student', 'student_name', 'student_employee_id',
            'checker', 'checker_name', 'content', 'score', 'comment',
            'checked_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['checker', 'created_at', 'updated_at']


class SpotCheckDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for spot check detail view.
    
    Requirements: 14.1
    """
    student_name = serializers.CharField(source='student.username', read_only=True)
    student_employee_id = serializers.CharField(source='student.employee_id', read_only=True)
    student_department = serializers.CharField(
        source='student.department.name', 
        read_only=True,
        allow_null=True
    )
    checker_name = serializers.CharField(source='checker.username', read_only=True)
    
    class Meta:
        model = SpotCheck
        fields = [
            'id', 'student', 'student_name', 'student_employee_id',
            'student_department', 'checker', 'checker_name',
            'content', 'score', 'comment', 'checked_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['checker', 'created_at', 'updated_at']


class SpotCheckCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating spot check records.
    
    Requirements:
    - 14.1: 存储被抽查学员、抽查内容、评分和评语
    - 14.2: 导师创建抽查记录时仅允许选择其名下学员
    - 14.3: 室经理创建抽查记录时仅允许选择本室学员
    
    Property 35: 抽查学员范围限制
    """
    
    class Meta:
        model = SpotCheck
        fields = ['student', 'content', 'score', 'comment', 'checked_at']
    
    def validate_student(self, value):
        """
        Validate that the student is within the checker's scope.
        
        Requirements: 14.2, 14.3
        Property 35: 抽查学员范围限制
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('无法验证用户权限')
        
        user = request.user
        
        # Get current role
        current_role = None
        if hasattr(user, 'current_role') and user.current_role:
            current_role = user.current_role
        else:
            if user.is_admin:
                current_role = 'ADMIN'
            elif user.is_dept_manager:
                current_role = 'DEPT_MANAGER'
            elif user.is_mentor:
                current_role = 'MENTOR'
        
        # Admin can create spot checks for any student
        if current_role == 'ADMIN':
            return value
        
        # Mentor can only create for their mentees
        if current_role == 'MENTOR':
            if value.mentor_id != user.id:
                raise serializers.ValidationError('只能为名下学员创建抽查记录')
            return value
        
        # Department manager can only create for department members
        if current_role == 'DEPT_MANAGER':
            if not user.department_id:
                raise serializers.ValidationError('您未分配部门，无法创建抽查记录')
            if value.department_id != user.department_id:
                raise serializers.ValidationError('只能为本室学员创建抽查记录')
            return value
        
        raise serializers.ValidationError('无权创建抽查记录')
    
    def validate_checked_at(self, value):
        """Validate that checked_at is not in the future."""
        if value > timezone.now():
            raise serializers.ValidationError('抽查时间不能是未来时间')
        return value
    
    def create(self, validated_data):
        """Create spot check with checker from context."""
        validated_data['checker'] = self.context['request'].user
        return SpotCheck.objects.create(**validated_data)


class SpotCheckUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating spot check records.
    
    Note: student and checker cannot be changed after creation.
    """
    
    class Meta:
        model = SpotCheck
        fields = ['content', 'score', 'comment', 'checked_at']
    
    def validate_checked_at(self, value):
        """Validate that checked_at is not in the future."""
        if value > timezone.now():
            raise serializers.ValidationError('抽查时间不能是未来时间')
        return value
