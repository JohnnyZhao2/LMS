from django.contrib import admin
from .models import Question, Quiz, QuizQuestion


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'content_preview', 'difficulty', 'is_public', 'is_deleted', 'created_by', 'created_at']
    list_filter = ['type', 'difficulty', 'is_public', 'is_deleted', 'created_at']
    search_fields = ['content']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('基本信息', {
            'fields': ('type', 'content', 'difficulty')
        }),
        ('答案信息', {
            'fields': ('options', 'correct_answer', 'analysis')
        }),
        ('状态', {
            'fields': ('is_public', 'is_deleted')
        }),
        ('元数据', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '题目内容'


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1
    fields = ['question', 'sort_order', 'score']
    autocomplete_fields = ['question']


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'question_count', 'total_score', 'pass_score', 'is_public', 'is_deleted', 'created_by', 'created_at']
    list_filter = ['is_public', 'is_deleted', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [QuizQuestionInline]
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description')
        }),
        ('评分设置', {
            'fields': ('total_score', 'pass_score')
        }),
        ('状态', {
            'fields': ('is_public', 'is_deleted')
        }),
        ('元数据', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
    
    def question_count(self, obj):
        return obj.get_question_count()
    question_count.short_description = '题目数量'


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'quiz', 'question_preview', 'sort_order', 'score', 'created_at']
    list_filter = ['quiz', 'created_at']
    search_fields = ['quiz__title', 'question__content']
    autocomplete_fields = ['quiz', 'question']
    
    def question_preview(self, obj):
        return obj.question.content[:50] + '...' if len(obj.question.content) > 50 else obj.question.content
    question_preview.short_description = '题目内容'
