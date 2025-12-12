from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import User


class Question(models.Model):
    """题目模型"""
    
    TYPE_CHOICES = [
        ('SINGLE', '单选题'),
        ('MULTIPLE', '多选题'),
        ('JUDGE', '判断题'),
        ('ESSAY', '简答题'),
    ]
    
    type = models.CharField('题目类型', max_length=20, choices=TYPE_CHOICES)
    content = models.TextField('题目内容')
    options = models.JSONField('选项', null=True, blank=True, help_text='选择题的选项，JSON格式')
    correct_answer = models.JSONField('正确答案', help_text='JSON格式存储答案')
    analysis = models.TextField('题目解析', null=True, blank=True)
    difficulty = models.IntegerField(
        '难度',
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='难度等级：1-5'
    )
    is_public = models.BooleanField('是否公开', default=False, help_text='公开题目可被所有人使用')
    is_deleted = models.BooleanField('是否删除', default=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_questions',
        verbose_name='创建人'
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        db_table = 'questions'
        verbose_name = '题目'
        verbose_name_plural = '题目'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['type']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['is_public']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return f'[{self.get_type_display()}] {self.content[:50]}'
    
    def soft_delete(self):
        """软删除"""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])
    
    def validate_answer(self, user_answer):
        """
        验证用户答案是否正确
        
        Args:
            user_answer: 用户答案（JSON格式）
            
        Returns:
            bool: 是否正确
        """
        if self.type == 'ESSAY':
            # 简答题需要人工评分
            return None
        
        if self.type == 'SINGLE':
            # 单选题：比较答案字符串
            return user_answer.get('answer') == self.correct_answer.get('answer')
        
        if self.type == 'MULTIPLE':
            # 多选题：比较答案列表（排序后）
            user_ans = sorted(user_answer.get('answer', []))
            correct_ans = sorted(self.correct_answer.get('answer', []))
            return user_ans == correct_ans
        
        if self.type == 'JUDGE':
            # 判断题：比较布尔值
            return user_answer.get('answer') == self.correct_answer.get('answer')
        
        return False


class Quiz(models.Model):
    """测验/试卷模型"""
    
    title = models.CharField('测验标题', max_length=200)
    description = models.TextField('测验描述', null=True, blank=True)
    questions = models.ManyToManyField(
        Question,
        through='QuizQuestion',
        related_name='quizzes',
        verbose_name='题目'
    )
    total_score = models.DecimalField(
        '总分',
        max_digits=5,
        decimal_places=2,
        default=100.00
    )
    pass_score = models.DecimalField(
        '及格分',
        max_digits=5,
        decimal_places=2,
        default=60.00
    )
    is_public = models.BooleanField('是否公开', default=False, help_text='公开测验可被所有人使用')
    is_deleted = models.BooleanField('是否删除', default=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_quizzes',
        verbose_name='创建人'
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        db_table = 'quizzes'
        verbose_name = '测验'
        verbose_name_plural = '测验'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_public']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return self.title
    
    def soft_delete(self):
        """软删除"""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])
    
    def get_question_count(self):
        """获取题目数量"""
        return self.quiz_questions.filter(question__is_deleted=False).count()
    
    def calculate_total_score(self):
        """计算总分（所有题目分数之和）"""
        return self.quiz_questions.aggregate(
            total=models.Sum('score')
        )['total'] or 0
    
    def get_questions_ordered(self):
        """获取按顺序排列的题目"""
        return self.quiz_questions.select_related('question').filter(
            question__is_deleted=False
        ).order_by('sort_order')
    
    def can_delete(self):
        """
        检查是否可以删除
        如果测验已关联到活跃的任务，则不能删除
        """
        # 检查是否有关联的任务（延迟导入避免循环依赖）
        try:
            from apps.tasks.models import TaskQuiz
            active_tasks = TaskQuiz.objects.filter(
                quiz=self,
                task__is_deleted=False,
                task__status__in=['DRAFT', 'PUBLISHED']
            ).exists()
            return not active_tasks
        except ImportError:
            # 如果tasks app还未创建，默认可以删除
            return True


class QuizQuestion(models.Model):
    """测验题目关联模型"""
    
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='测验'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='题目'
    )
    sort_order = models.IntegerField('排序', help_text='题目在测验中的顺序')
    score = models.DecimalField(
        '分值',
        max_digits=5,
        decimal_places=2,
        help_text='该题目在此测验中的分值'
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    
    class Meta:
        db_table = 'quiz_questions'
        verbose_name = '测验题目'
        verbose_name_plural = '测验题目'
        ordering = ['sort_order']
        unique_together = ('quiz', 'question')
        indexes = [
            models.Index(fields=['quiz', 'sort_order']),
        ]
    
    def __str__(self):
        return f'{self.quiz.title} - {self.question.content[:30]} (顺序: {self.sort_order})'
