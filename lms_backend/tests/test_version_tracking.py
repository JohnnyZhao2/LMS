"""
版本追溯和隔离机制的集成测试

测试场景：
1. 答案记录题目版本
2. 答题记录试卷版本
3. 题目修改后试卷引用不自动更新
4. 版本回溯查询
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.questions.models import Question
from apps.quizzes.models import Quiz, QuizQuestion
from apps.tasks.models import Task, TaskQuiz, TaskAssignment
from apps.submissions.models import Submission, Answer
from apps.submissions.services import SubmissionService

User = get_user_model()


@pytest.mark.django_db
class TestVersionTracking:
    """版本追溯测试"""
    
    @pytest.fixture
    def question_v1(self, admin_user):
        """创建题目 v1"""
        import uuid
        return Question.objects.create(
            content="1+1=?",
            question_type='SINGLE_CHOICE',
            options=[
                {"key": "A", "value": "1"},
                {"key": "B", "value": "2"},
                {"key": "C", "value": "3"},
            ],
            answer="B",
            explanation="1+1=2",
            score=Decimal('10.00'),
            created_by=admin_user,
            resource_uuid=uuid.uuid4(),
            version_number=1,
            is_current=True
        )
    
    @pytest.fixture
    def quiz_v1(self, admin_user, question_v1):
        """创建试卷 v1"""
        import uuid
        quiz = Quiz.objects.create(
            title="测试试卷",
            description="测试用试卷",
            quiz_type='PRACTICE',
            created_by=admin_user,
            resource_uuid=uuid.uuid4(),
            version_number=1,
            is_current=True
        )
        QuizQuestion.objects.create(
            quiz=quiz,
            question=question_v1,
            order=1
        )
        return quiz
    
    def test_answer_tracks_question_version(self, admin_user, student_user, question_v1, quiz_v1):
        """
        测试场景1：答案记录题目版本
        
        验证：
        1. 学员答题时记录题目版本
        2. 题目修改后，答案仍指向原版本
        3. 可以通过版本号查询原题目
        """
        # 1. 创建任务
        task = Task.objects.create(
            title="测试任务",
            deadline=timezone.now() + timezone.timedelta(days=7),
            created_by=admin_user
        )
        TaskQuiz.objects.create(
            task=task,
            quiz=quiz_v1,
            resource_uuid=quiz_v1.resource_uuid,
            version_number=quiz_v1.version_number
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=student_user
        )
        
        # 2. 学员开始答题
        service = SubmissionService()
        task_quiz = task.task_quizzes.first()
        submission = service.start_quiz(
            assignment=assignment,
            task_quiz=task_quiz,
            user=student_user,
            is_exam=False
        )
        
        # 3. 验证答案记录了题目版本
        answer = submission.answers.first()
        assert answer.question_resource_uuid == question_v1.resource_uuid
        assert answer.question_version_number == 1
        assert answer.question_id == question_v1.id
        
        # 4. 修改题目 → v2
        question_v2 = question_v1.clone_new_version()
        question_v2.content = "2+2=?"
        question_v2.answer = "C"  # 改为选项 C
        question_v2.save()
        
        # 验证 v2 创建成功
        assert question_v2.version_number == 2
        assert question_v2.is_current is True
        
        # 验证 v1 不再是当前版本
        question_v1.refresh_from_db()
        assert question_v1.is_current is False
        
        # 5. 验证答案仍然指向 v1
        answer.refresh_from_db()
        assert answer.question_version_number == 1
        assert answer.question_id == question_v1.id  # 仍指向旧题目
        
        # 6. 可以通过版本号查询原题目
        original_question = Question.objects.get(
            resource_uuid=answer.question_resource_uuid,
            version_number=answer.question_version_number
        )
        assert original_question.id == question_v1.id
        assert original_question.content == "1+1=?"
        assert original_question.answer == "B"
    
    def test_submission_tracks_quiz_version(self, admin_user, student_user, question_v1, quiz_v1):
        """
        测试场景2：答题记录试卷版本
        
        验证：
        1. 学员答题时记录试卷版本
        2. 试卷修改后，答题记录仍指向原版本
        3. 可以通过版本号查询原试卷
        """
        # 1. 创建任务
        task = Task.objects.create(
            title="测试任务",
            deadline=timezone.now() + timezone.timedelta(days=7),
            created_by=admin_user
        )
        TaskQuiz.objects.create(
            task=task,
            quiz=quiz_v1,
            resource_uuid=quiz_v1.resource_uuid,
            version_number=quiz_v1.version_number
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=student_user
        )
        
        # 2. 学员开始答题
        service = SubmissionService()
        task_quiz = task.task_quizzes.first()
        submission = service.start_quiz(
            assignment=assignment,
            task_quiz=task_quiz,
            user=student_user,
            is_exam=False
        )
        
        # 3. 验证答题记录了试卷版本
        assert submission.quiz_resource_uuid == quiz_v1.resource_uuid
        assert submission.quiz_version_number == 1
        assert submission.quiz_id == quiz_v1.id
        
        # 4. 修改试卷 → v2（添加新题目）
        question_v2 = Question.objects.create(
            content="3+3=?",
            question_type='SINGLE_CHOICE',
            options=[
                {"key": "A", "value": "5"},
                {"key": "B", "value": "6"},
                {"key": "C", "value": "7"},
            ],
            answer="B",
            score=Decimal('10.00'),
            created_by=admin_user
        )
        
        quiz_v2 = Quiz.objects.create(
            title=quiz_v1.title,
            description=quiz_v1.description,
            quiz_type=quiz_v1.quiz_type,
            created_by=admin_user,
            resource_uuid=quiz_v1.resource_uuid,
            version_number=2,
            source_version=quiz_v1,
            is_current=True
        )
        
        # 复制原有题目
        QuizQuestion.objects.create(
            quiz=quiz_v2,
            question=question_v1,
            order=1
        )
        # 添加新题目
        QuizQuestion.objects.create(
            quiz=quiz_v2,
            question=question_v2,
            order=2
        )
        
        # 更新 v1 的 is_current
        quiz_v1.is_current = False
        quiz_v1.save()
        
        # 验证 v2 创建成功
        assert quiz_v2.version_number == 2
        assert quiz_v2.is_current is True
        assert quiz_v2.question_count == 2
        
        # 验证 v1 不再是当前版本
        quiz_v1.refresh_from_db()
        assert quiz_v1.is_current is False
        assert quiz_v1.question_count == 1
        
        # 5. 验证答题记录仍然指向 v1
        submission.refresh_from_db()
        assert submission.quiz_version_number == 1
        assert submission.quiz_id == quiz_v1.id
        
        # 6. 可以通过版本号查询原试卷
        original_quiz = Quiz.objects.get(
            resource_uuid=submission.quiz_resource_uuid,
            version_number=submission.quiz_version_number
        )
        assert original_quiz.id == quiz_v1.id
        assert original_quiz.question_count == 1
    
    def test_quiz_question_not_auto_updated(self, admin_user, question_v1, quiz_v1):
        """
        测试场景3：题目修改后试卷引用不自动更新
        
        验证：
        1. QuizQuestion 引用特定题目 ID
        2. 题目修改创建新版本后，QuizQuestion 仍指向旧版本
        3. 这确保了试卷的稳定性
        """
        # 1. 验证初始状态
        quiz_question = QuizQuestion.objects.get(quiz=quiz_v1)
        assert quiz_question.question_id == question_v1.id
        assert quiz_question.question.version_number == 1
        assert quiz_question.question.content == "1+1=?"
        
        # 2. 修改题目 → v2
        question_v2 = question_v1.clone_new_version()
        question_v2.content = "2+2=?"
        question_v2.save()
        
        # 验证新版本创建成功
        assert question_v2.version_number == 2
        assert question_v2.is_current is True
        assert question_v2.content == "2+2=?"
        
        # 3. 验证 QuizQuestion 仍然指向旧题目
        quiz_question.refresh_from_db()
        assert quiz_question.question_id == question_v1.id  # 未改变
        assert quiz_question.question.version_number == 1
        assert quiz_question.question.content == "1+1=?"
        
        # 4. 验证试卷获取的题目仍是旧版本
        ordered_questions = quiz_v1.get_ordered_questions()
        assert ordered_questions.count() == 1
        assert ordered_questions.first().question.id == question_v1.id
        assert ordered_questions.first().question.content == "1+1=?"
    
    def test_version_isolation_in_task(self, admin_user, student_user, question_v1, quiz_v1):
        """
        测试场景4：任务中的版本隔离
        
        验证：
        1. 任务创建时锁定试卷版本
        2. 试卷修改后，任务仍使用原版本
        3. 学员看到的是任务创建时的版本
        """
        # 1. 创建任务，锁定试卷 v1
        task = Task.objects.create(
            title="测试任务",
            deadline=timezone.now() + timezone.timedelta(days=7),
            created_by=admin_user
        )
        task_quiz = TaskQuiz.objects.create(
            task=task,
            quiz=quiz_v1,
            resource_uuid=quiz_v1.resource_uuid,
            version_number=quiz_v1.version_number
        )
        
        # 验证任务锁定了版本
        assert task_quiz.resource_uuid == quiz_v1.resource_uuid
        assert task_quiz.version_number == 1
        
        # 2. 修改试卷 → v2
        quiz_v2 = Quiz.objects.create(
            title=quiz_v1.title,
            description="修改后的描述",
            quiz_type=quiz_v1.quiz_type,
            created_by=admin_user,
            resource_uuid=quiz_v1.resource_uuid,
            version_number=2,
            source_version=quiz_v1,
            is_current=True
        )
        QuizQuestion.objects.create(
            quiz=quiz_v2,
            question=question_v1,
            order=1
        )
        
        quiz_v1.is_current = False
        quiz_v1.save()
        
        # 3. 验证任务仍使用 v1
        task_quiz.refresh_from_db()
        assert task_quiz.version_number == 1
        
        # 4. 获取任务的版本化试卷
        versioned_quiz = task_quiz.get_versioned_quiz()
        assert versioned_quiz.id == quiz_v1.id
        assert versioned_quiz.version_number == 1
        assert versioned_quiz.description == "测试用试卷"  # 原描述
        
        # 5. 学员答题时使用的是 v1
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=student_user
        )
        service = SubmissionService()
        submission = service.start_quiz(
            assignment=assignment,
            task_quiz=task_quiz,
            user=student_user,
            is_exam=False
        )
        
        assert submission.quiz_version_number == 1
        assert submission.quiz_id == quiz_v1.id


@pytest.mark.django_db
class TestVersionQueryOptimization:
    """版本查询优化测试"""
    
    def test_get_current_version(self, admin_user):
        """测试获取当前版本"""
        import uuid
        test_uuid = uuid.uuid4()
        # 创建多个版本
        q1 = Question.objects.create(
            content="v1",
            question_type='SINGLE_CHOICE',
            options=[{"key": "A", "value": "1"}],
            answer="A",
            created_by=admin_user,
            resource_uuid=test_uuid,
            version_number=1,
            is_current=False
        )
        
        q2 = Question.objects.create(
            content="v2",
            question_type='SINGLE_CHOICE',
            options=[{"key": "A", "value": "1"}],
            answer="A",
            created_by=admin_user,
            resource_uuid=test_uuid,
            version_number=2,
            is_current=False
        )
        
        q3 = Question.objects.create(
            content="v3",
            question_type='SINGLE_CHOICE',
            options=[{"key": "A", "value": "1"}],
            answer="A",
            created_by=admin_user,
            resource_uuid=test_uuid,
            version_number=3,
            is_current=True
        )
        
        # 查询当前版本
        current = Question.objects.filter(
            resource_uuid=test_uuid,
            is_current=True
        ).first()
        
        assert current.id == q3.id
        assert current.version_number == 3
        assert current.content == "v3"
    
    def test_get_specific_version(self, admin_user):
        """测试获取特定版本"""
        import uuid
        test_uuid = uuid.uuid4()
        # 创建多个版本
        q1 = Question.objects.create(
            content="v1",
            question_type='SINGLE_CHOICE',
            options=[{"key": "A", "value": "1"}],
            answer="A",
            created_by=admin_user,
            resource_uuid=test_uuid,
            version_number=1,
            is_current=False
        )
        
        q2 = Question.objects.create(
            content="v2",
            question_type='SINGLE_CHOICE',
            options=[{"key": "A", "value": "1"}],
            answer="A",
            created_by=admin_user,
            resource_uuid=test_uuid,
            version_number=2,
            is_current=True
        )
        
        # 查询特定版本
        v1 = Question.objects.get(
            resource_uuid=test_uuid,
            version_number=1
        )
        
        assert v1.id == q1.id
        assert v1.content == "v1"
        assert v1.is_current is False
