"""
Serializers for analytics module.

Implements serializers for:
- Student dashboard (Requirements: 15.1, 15.2, 15.3)
- Student knowledge center (Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6)
- Student task center (Requirements: 17.1, 17.2, 17.3)
- Mentor/Department manager dashboard (Requirements: 19.1, 19.2, 19.3, 19.4)
- Team manager data board (Requirements: 21.1, 21.2, 21.3)
"""
import re
from rest_framework import serializers

from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge


class StudentPendingTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for student's pending tasks on dashboard.
    
    Requirements:
    - 15.1: 展示待办任务列表（学习/练习/考试）
    - 15.3: 点击待办任务跳转到对应任务详情页
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title',
            'deadline', 'created_by_name', 'status', 'status_display',
            'progress', 'created_at'
        ]
    
    def get_progress(self, obj):
        """
        Calculate progress based on total items (knowledge + quizzes).
        """
        task = obj.task
        
        total_k = task.task_knowledge.count()
        total_q = task.task_quizzes.count()
        total = total_k + total_q
            
        if total == 0:
            return {'completed': 0, 'total': 0, 'percentage': 0}
            
        completed_k = obj.knowledge_progress.filter(is_completed=True).count()
            
        from apps.submissions.models import Submission
        completed_q_ids = set(
            Submission.objects.filter(
                task_assignment=obj
                # Consider passed quizzes? Or just submitted? Assuming submitted/graded counts as done
            ).values_list('quiz_id', flat=True).distinct()
        )
        completed_q = len(completed_q_ids)
            
        completed = completed_k + completed_q
        
        return {
            'completed': completed,
            'total': total,
            'percentage': round(completed / total * 100, 1)
        }


class LatestKnowledgeSerializer(serializers.ModelSerializer):
    """
    Serializer for latest knowledge documents on dashboard.
    
    Requirements:
    - 15.2: 展示最新发布的知识文档
    """
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    knowledge_type_display = serializers.CharField(source='get_knowledge_type_display', read_only=True)
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'knowledge_type_display',
            'content_preview', 'operation_tags',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at'
        ]
    
    def get_content_preview(self, obj):
        """Get content preview from Knowledge model property."""
        return obj.content_preview
    
    def get_updated_by_name(self, obj):
        """Get name of last updater."""
        if obj.updated_by:
            return obj.updated_by.username
        return obj.created_by.username if obj.created_by else None


class StudentDashboardSerializer(serializers.Serializer):
    """
    Serializer for student dashboard data.
    
    Requirements:
    - 15.1: 展示待办任务列表（学习/练习/考试）
    - 15.2: 展示最新发布的知识文档
    - 15.3: 点击待办任务跳转到对应任务详情页
    """
    pending_tasks = StudentPendingTaskSerializer(many=True, read_only=True)
    latest_knowledge = LatestKnowledgeSerializer(many=True, read_only=True)
    task_summary = serializers.DictField(read_only=True)


# ============ Student Knowledge Center Serializers ============
# Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
# Note: 已改用条线类型和系统标签进行分类，不再使用 KnowledgeCategory


class StudentKnowledgeListSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge list in student knowledge center.
    
    Requirements:
    - 16.3: 以卡片形式展示操作标签、标题、摘要、修改人和修改时间
    """
    updated_by_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    knowledge_type_display = serializers.CharField(
        source='get_knowledge_type_display', read_only=True
    )
    line_type_display = serializers.CharField(
        source='get_line_type_display', read_only=True
    )
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'knowledge_type_display',
            'content_preview', 'operation_tags',
            'line_type', 'line_type_display',
            'updated_by_name', 'created_by_name', 'updated_at'
        ]
    
    def get_content_preview(self, obj):
        """Get content preview from Knowledge model property."""
        return obj.content_preview
    
    def get_updated_by_name(self, obj):
        """Get name of last updater (修改人)."""
        if obj.updated_by:
            return obj.updated_by.username
        return obj.created_by.username if obj.created_by else None


class StudentKnowledgeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for knowledge detail in student knowledge center.
    
    Requirements:
    - 16.4: 应急类知识按结构化字段顺序展示已填写内容
    - 16.5: 其他类型知识展示 Markdown/富文本正文
    - 16.6: 在右侧展示自动生成的内容目录
    """
    updated_by_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    knowledge_type_display = serializers.CharField(
        source='get_knowledge_type_display', read_only=True
    )
    line_type_display = serializers.CharField(
        source='get_line_type_display', read_only=True
    )
    table_of_contents = serializers.SerializerMethodField()
    
    class Meta:
        model = Knowledge
        fields = [
            'id', 'title', 'knowledge_type', 'knowledge_type_display',
            'line_type', 'line_type_display',
            # 应急类知识的结构化字段
            'fault_scenario', 'trigger_process', 'solution',
            'verification_plan', 'recovery_plan',
            # 其他类型知识的正文内容
            'content', 'operation_tags',
            # Computed fields
            'table_of_contents',
            'created_by_name', 'updated_by_name',
            'view_count', 'created_at', 'updated_at'
        ]
    
    def get_updated_by_name(self, obj):
        """Get name of last updater."""
        if obj.updated_by:
            return obj.updated_by.username
        return obj.created_by.username if obj.created_by else None
    
    def get_table_of_contents(self, obj):
        """
        Generate table of contents from content.
        
        Requirements:
        - 16.6: 在右侧展示自动生成的内容目录
        
        For EMERGENCY type: Generate from structured field titles
        For OTHER type: Extract headings from Markdown content
        """
        toc = []
        
        if obj.knowledge_type == 'EMERGENCY':
            # Generate TOC from structured fields
            field_mapping = [
                ('fault_scenario', '故障场景'),
                ('trigger_process', '触发流程'),
                ('solution', '解决方案'),
                ('verification_plan', '验证方案'),
                ('recovery_plan', '恢复方案'),
            ]
            
            for field_name, title in field_mapping:
                content = getattr(obj, field_name, '')
                if content and content.strip():
                    toc.append({
                        'id': field_name,
                        'title': title,
                        'level': 1
                    })
        else:
            # Extract headings from Markdown content
            if obj.content:
                toc = self._extract_markdown_headings(obj.content)
        
        return toc
    
    def _extract_markdown_headings(self, content):
        """
        Extract headings from Markdown content.
        
        Supports:
        - # Heading 1
        - ## Heading 2
        - ### Heading 3
        """
        headings = []
        # Match Markdown headings (# to ###)
        pattern = r'^(#{1,3})\s+(.+)$'
        
        for line in content.split('\n'):
            match = re.match(pattern, line.strip())
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                # Generate ID from title (slugify)
                heading_id = re.sub(r'[^\w\s-]', '', title.lower())
                heading_id = re.sub(r'[\s_]+', '-', heading_id)
                
                headings.append({
                    'id': heading_id,
                    'title': title,
                    'level': level
                })
        
        return headings


# ============ Student Task Center Serializers ============
# Requirements: 17.1, 17.2, 17.3


class StudentTaskCenterListSerializer(serializers.ModelSerializer):
    """
    Serializer for task list in student task center.
    
    Requirements:
    - 17.1: 展示任务列表，支持按类型和状态筛选
    - 17.2: 展示任务标题、类型、状态、截止时间和进度
    - 17.3: 点击任务时根据任务类型跳转到对应的任务详情页
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title', 'task_description',
            'deadline',
            'created_by_name', 'status', 'status_display',
            'progress', 'score', 'completed_at', 'created_at'
        ]
    
    def get_progress(self, obj):
        """
        Calculate progress based on total items (knowledge + quizzes).
        """
        task = obj.task
        
        total_k = task.task_knowledge.count()
        total_q = task.task_quizzes.count()
        total = total_k + total_q
            
        if total == 0:
            return {'completed': 0, 'total': 0, 'percentage': 0}
            
        completed_k = obj.knowledge_progress.filter(is_completed=True).count()
            
        from apps.submissions.models import Submission
        completed_q_ids = set(
            Submission.objects.filter(
                task_assignment=obj
            ).values_list('quiz_id', flat=True).distinct()
        )
        completed_q = len(completed_q_ids)
            
        completed = completed_k + completed_q
        
        return {
            'completed': completed,
            'total': total,
            'percentage': round(completed / total * 100, 1)
        }


# ============ Student Personal Center Serializers ============
# Requirements: 18.1, 18.2, 18.3, 18.4


class StudentProfileSerializer(serializers.Serializer):
    """
    Serializer for student personal information.
    
    Requirements:
    - 18.1: 学员访问个人中心时展示姓名、团队、导师信息
    """
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    department_id = serializers.IntegerField(source='department.id', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    mentor_id = serializers.IntegerField(source='mentor.id', read_only=True, allow_null=True)
    mentor_name = serializers.CharField(source='mentor.username', read_only=True, allow_null=True)
    roles = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(read_only=True)
    
    def get_roles(self, obj):
        """Get user's role list."""
        return [
            {'code': role.code, 'name': role.name}
            for role in obj.roles.all()
        ]


class StudentScoreRecordSerializer(serializers.Serializer):
    """
    Serializer for student's historical score records.
    
    Requirements:
    - 18.2: 学员查看历史成绩时展示练习和考试的成绩记录
    """
    id = serializers.IntegerField(read_only=True)
    task_id = serializers.IntegerField(source='task_assignment.task.id', read_only=True)
    task_title = serializers.CharField(source='task_assignment.task.title', read_only=True)
    quiz_id = serializers.IntegerField(source='quiz.id', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    attempt_number = serializers.IntegerField(read_only=True)
    total_score = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    obtained_score = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_passed = serializers.SerializerMethodField()
    pass_score = serializers.SerializerMethodField()
    submitted_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    def get_is_passed(self, obj):
        """Check if the submission passed."""
        # Assume pass if score >= pass_score (if defined)
        # Or remove this logic if pass_score removed from Task. 
        # But we assume pass_score is removed. So always return None?
        # Or if Quiz has pass_score?
        # For now, return None as Task model doesn't support pass_score
        return None
    
    def get_pass_score(self, obj):
        return None


class WrongAnswerSerializer(serializers.Serializer):
    """
    Serializer for wrong answers in student's wrong answer book.
    
    Requirements:
    - 18.3: 学员查看错题本时展示练习和考试中答错的题目
    """
    id = serializers.IntegerField(read_only=True)
    submission_id = serializers.IntegerField(source='submission.id', read_only=True)
    task_title = serializers.CharField(source='submission.task_assignment.task.title', read_only=True)
    quiz_title = serializers.CharField(source='submission.quiz.title', read_only=True)
    
    # Question details
    question_id = serializers.IntegerField(source='question.id', read_only=True)
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)
    question_type_display = serializers.CharField(source='question.get_question_type_display', read_only=True)
    question_options = serializers.JSONField(source='question.options', read_only=True)
    question_score = serializers.DecimalField(source='question.score', max_digits=5, decimal_places=2, read_only=True)
    
    # Answer details
    user_answer = serializers.JSONField(read_only=True)
    correct_answer = serializers.JSONField(source='question.answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    obtained_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Timestamps
    submitted_at = serializers.DateTimeField(source='submission.submitted_at', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class StudentScoreExportSerializer(serializers.Serializer):
    """
    Serializer for exporting student's score records.
    
    Requirements:
    - 18.4: 学员导出记录时生成包含历史成绩的导出文件
    """
    task_title = serializers.CharField()
    quiz_title = serializers.CharField()
    attempt_number = serializers.IntegerField()
    total_score = serializers.DecimalField(max_digits=6, decimal_places=2)
    obtained_score = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    is_passed = serializers.CharField(allow_null=True)
    submitted_at = serializers.DateTimeField(allow_null=True)


# ============ Mentor/Department Manager Dashboard Serializers ============
# Requirements: 19.1, 19.2, 19.3, 19.4


class MentorStudentStatSerializer(serializers.Serializer):
    """
    Serializer for individual student statistics in mentor dashboard.
    
    Requirements:
    - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
    - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
    """
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    
    # Task statistics
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    in_progress_tasks = serializers.IntegerField(read_only=True)
    overdue_tasks = serializers.IntegerField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    
    # Score statistics
    avg_score = serializers.FloatField(read_only=True, allow_null=True)
    exam_count = serializers.IntegerField(read_only=True)
    exam_passed_count = serializers.IntegerField(read_only=True)
    exam_pass_rate = serializers.FloatField(read_only=True, allow_null=True)


class MentorDashboardSummarySerializer(serializers.Serializer):
    """
    Serializer for mentor dashboard summary statistics.
    
    Requirements:
    - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
    - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
    - 19.3: 用户访问仪表盘时展示待评分考试数量
    """
    # Student count
    total_students = serializers.IntegerField(read_only=True)
    
    # Task statistics
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    in_progress_tasks = serializers.IntegerField(read_only=True)
    overdue_tasks = serializers.IntegerField(read_only=True)
    overall_completion_rate = serializers.FloatField(read_only=True)
    
    # Score statistics
    overall_avg_score = serializers.FloatField(read_only=True, allow_null=True)
    
    # Grading statistics (Requirements 19.3)
    pending_grading_count = serializers.IntegerField(read_only=True)
    
    # Task status breakdown
    learning_tasks = serializers.DictField(read_only=True)


class MentorDashboardSerializer(serializers.Serializer):
    """
    Serializer for complete mentor/department manager dashboard data.
    
    Requirements:
    - 19.1: 导师访问仪表盘时展示名下学员的完成率和平均分
    - 19.2: 室经理访问仪表盘时展示本室学员的完成率和平均分
    - 19.3: 用户访问仪表盘时展示待评分考试数量
    - 19.4: 用户访问仪表盘时提供新建任务、测试中心、抽查的快捷入口
    """
    summary = MentorDashboardSummarySerializer(read_only=True)
    students = MentorStudentStatSerializer(many=True, read_only=True)
    quick_links = serializers.DictField(read_only=True)


# ============ Team Manager Data Board Serializers ============
# Requirements: 21.1, 21.2, 21.3


class DepartmentStatSerializer(serializers.Serializer):
    """
    Serializer for department statistics in team manager data board.
    
    Requirements:
    - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
    """
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    
    # Student count
    total_students = serializers.IntegerField(read_only=True)
    
    # Task statistics
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    in_progress_tasks = serializers.IntegerField(read_only=True)
    overdue_tasks = serializers.IntegerField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    
    # Score statistics
    avg_score = serializers.FloatField(read_only=True, allow_null=True)
    
    # Exam statistics
    exam_count = serializers.IntegerField(read_only=True)
    exam_passed_count = serializers.IntegerField(read_only=True)
    exam_pass_rate = serializers.FloatField(read_only=True, allow_null=True)


class KnowledgeHeatSerializer(serializers.Serializer):
    """
    Serializer for knowledge heat statistics in team manager data board.
    
    Requirements:
    - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
    """
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    knowledge_type = serializers.CharField(read_only=True)
    knowledge_type_display = serializers.CharField(read_only=True)
    line_type = serializers.CharField(read_only=True)
    line_type_display = serializers.CharField(read_only=True)
    view_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class TeamManagerOverviewSerializer(serializers.Serializer):
    """
    Serializer for team manager data board overview.
    
    Requirements:
    - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
    """
    # Overall statistics
    total_departments = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    overall_completion_rate = serializers.FloatField(read_only=True)
    overall_avg_score = serializers.FloatField(read_only=True, allow_null=True)
    
    # Task status breakdown
    learning_tasks = serializers.DictField(read_only=True)


class TeamManagerDashboardSerializer(serializers.Serializer):
    """
    Serializer for complete team manager data board.
    
    Requirements:
    - 21.1: 团队经理访问数据看板时展示各室完成率与成绩对比
    - 21.2: 团队经理查看知识热度时展示知识文档的阅读统计
    - 21.3: 团队经理查看数据时仅提供只读访问，禁止任何修改操作
    """
    overview = TeamManagerOverviewSerializer(read_only=True)
    departments = DepartmentStatSerializer(many=True, read_only=True)
    knowledge_heat = KnowledgeHeatSerializer(many=True, read_only=True)
