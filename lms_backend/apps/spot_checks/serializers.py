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
    创建抽查记录序列化器
    
    业务验证逻辑已移至 Service 层。
    
    Requirements:
    - 14.1: 存储被抽查学员、抽查内容、评分和评语
    - 14.2: 导师创建抽查记录时仅允许选择其名下学员
    - 14.3: 室经理创建抽查记录时仅允许选择本室学员
    
    Property 35: 抽查学员范围限制
    """
    
    class Meta:
        model = SpotCheck
        fields = ['student', 'content', 'score', 'comment', 'checked_at']


class SpotCheckUpdateSerializer(serializers.ModelSerializer):
    """
    更新抽查记录序列化器
    
    注意：student 和 checker 在创建后不能修改。
    业务验证逻辑已移至 Service 层。
    """
    
    class Meta:
        model = SpotCheck
        fields = ['content', 'score', 'comment', 'checked_at']
