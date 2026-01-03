"""
Domain 层基础测试

验证新创建的 Domain 层是否正常工作。
"""
import pytest
from datetime import datetime
from decimal import Decimal
import uuid

from apps.questions.domain.models import (
    QuestionDomain, QuestionStatus, QuestionType, Difficulty
)
from apps.questions.domain.services import QuestionDomainService
from apps.quizzes.domain.models import QuizDomain, QuizStatus, QuizType
from apps.quizzes.domain.services import QuizDomainService
from apps.submissions.domain.models import (
    SubmissionDomain, AnswerDomain, SubmissionStatus
)
from apps.submissions.domain.services import SubmissionDomainService


@pytest.mark.django_db
class TestQuestionDomain:
    """测试 Question Domain 层"""
    
    def test_create_question_domain(self):
        """测试创建 Question Domain"""
        question = QuestionDomain(
            content='测试题目',
            question_type=QuestionType.SINGLE_CHOICE,
            options=[{'key': 'A', 'value': '选项A'}, {'key': 'B', 'value': '选项B'}],
            answer='A',
            explanation='这是解析',
            score=Decimal('5.0'),
            difficulty=Difficulty.MEDIUM,
            created_by_id=1,
        )
        
        assert question.content == '测试题目'
        assert question.question_type == QuestionType.SINGLE_CHOICE
        assert question.is_objective is True
        assert question.is_subjective is False
    
    def test_question_domain_validation(self):
        """测试 Question Domain 验证"""
        # 测试空内容应该失败
        with pytest.raises(ValueError, match='题目内容不能为空'):
            QuestionDomain(
                content='',
                question_type=QuestionType.SINGLE_CHOICE,
                answer='A',
            )
    
    def test_question_domain_service_publish(self):
        """测试 Question Domain Service 发布功能"""
        question = QuestionDomain(
            content='测试题目',
            question_type=QuestionType.SINGLE_CHOICE,
            options=[{'key': 'A', 'value': '选项A'}],
            answer='A',
            status=QuestionStatus.DRAFT,
            created_by_id=1,
        )
        
        published = QuestionDomainService.publish_question(
            question,
            published_at=datetime.now(),
            updated_by_id=1
        )
        
        assert published.is_published() is True
        assert published.published_at is not None


@pytest.mark.django_db
class TestQuizDomain:
    """测试 Quiz Domain 层"""
    
    def test_create_quiz_domain(self):
        """测试创建 Quiz Domain"""
        quiz = QuizDomain(
            title='测试试卷',
            description='这是测试',
            quiz_type=QuizType.PRACTICE,
            question_ids=[1, 2, 3],
            created_by_id=1,
        )
        
        assert quiz.title == '测试试卷'
        assert quiz.quiz_type == QuizType.PRACTICE
        assert quiz.has_questions() is True
    
    def test_quiz_domain_validation(self):
        """测试 Quiz Domain 验证"""
        # 测试空标题应该失败
        with pytest.raises(ValueError, match='试卷名称不能为空'):
            QuizDomain(
                title='',
                question_ids=[1],
            )


@pytest.mark.django_db
class TestSubmissionDomain:
    """测试 Submission Domain 层"""
    
    def test_create_submission_domain(self):
        """测试创建 Submission Domain"""
        submission = SubmissionDomain(
            task_assignment_id=1,
            quiz_id=1,
            user_id=1,
            status=SubmissionStatus.IN_PROGRESS,
        )
        
        assert submission.is_in_progress() is True
        assert submission.can_submit() is True
    
    def test_submission_domain_service_submit(self):
        """测试 Submission Domain Service 提交功能"""
        submission = SubmissionDomain(
            task_assignment_id=1,
            quiz_id=1,
            user_id=1,
            status=SubmissionStatus.IN_PROGRESS,
        )
        
        submitted = SubmissionDomainService.submit(
            submission,
            submitted_at=datetime.now(),
            has_subjective_questions=False
        )
        
        assert submitted.is_graded() is True  # 纯客观题直接完成
