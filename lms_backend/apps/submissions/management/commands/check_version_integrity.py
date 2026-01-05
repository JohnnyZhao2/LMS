"""
检查版本数据完整性的管理命令

用法:
    python manage.py check_version_integrity
    python manage.py check_version_integrity --fix  # 自动修复缺失的版本数据
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.submissions.models import Answer, Submission
from apps.questions.models import Question
from apps.quizzes.models import Quiz


class Command(BaseCommand):
    help = '检查版本数据完整性'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='自动修复缺失的版本数据',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('开始检查版本数据完整性...'))
        
        # 检查 Answer 的版本字段
        self.check_answer_versions(fix=options['fix'])
        
        # 检查 Submission 的版本字段
        self.check_submission_versions(fix=options['fix'])
        
        # 检查版本号是否能找到对应的资源
        self.check_version_references()
        
        self.stdout.write(self.style.SUCCESS('\n检查完成！'))
    
    def check_answer_versions(self, fix=False):
        """检查 Answer 的版本字段"""
        self.stdout.write('\n=== 检查 Answer 版本字段 ===')
        
        # 统计缺失版本信息的 Answer
        missing_uuid = Answer.objects.filter(
            question_resource_uuid__isnull=True
        ).count()
        
        missing_version = Answer.objects.filter(
            question_version_number__isnull=True
        ).count()
        
        self.stdout.write(f'缺少 question_resource_uuid 的 Answer: {missing_uuid}')
        self.stdout.write(f'缺少 question_version_number 的 Answer: {missing_version}')
        
        if missing_uuid > 0 or missing_version > 0:
            if fix:
                self.stdout.write(self.style.WARNING('开始修复 Answer 版本数据...'))
                self.fix_answer_versions()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        '发现缺失数据！使用 --fix 参数自动修复'
                    )
                )
        else:
            self.stdout.write(self.style.SUCCESS('✓ Answer 版本数据完整'))
    
    def check_submission_versions(self, fix=False):
        """检查 Submission 的版本字段"""
        self.stdout.write('\n=== 检查 Submission 版本字段 ===')
        
        # 统计缺失版本信息的 Submission
        missing_uuid = Submission.objects.filter(
            quiz_resource_uuid__isnull=True
        ).count()
        
        missing_version = Submission.objects.filter(
            quiz_version_number__isnull=True
        ).count()
        
        self.stdout.write(f'缺少 quiz_resource_uuid 的 Submission: {missing_uuid}')
        self.stdout.write(f'缺少 quiz_version_number 的 Submission: {missing_version}')
        
        if missing_uuid > 0 or missing_version > 0:
            if fix:
                self.stdout.write(self.style.WARNING('开始修复 Submission 版本数据...'))
                self.fix_submission_versions()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        '发现缺失数据！使用 --fix 参数自动修复'
                    )
                )
        else:
            self.stdout.write(self.style.SUCCESS('✓ Submission 版本数据完整'))
    
    def check_version_references(self):
        """检查版本号是否能找到对应的资源"""
        self.stdout.write('\n=== 检查版本引用完整性 ===')
        
        # 检查 Answer 引用的题目版本是否存在
        orphaned_answers = 0
        for answer in Answer.objects.filter(
            question_resource_uuid__isnull=False,
            question_version_number__isnull=False
        ).iterator():
            exists = Question.objects.filter(
                resource_uuid=answer.question_resource_uuid,
                version_number=answer.question_version_number
            ).exists()
            if not exists:
                orphaned_answers += 1
                if orphaned_answers <= 5:  # 只显示前5个
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Answer {answer.id} 引用的题目版本不存在: '
                            f'{answer.question_resource_uuid} v{answer.question_version_number}'
                        )
                    )
        
        if orphaned_answers > 0:
            self.stdout.write(
                self.style.ERROR(
                    f'✗ 发现 {orphaned_answers} 个 Answer 引用的题目版本不存在'
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('✓ Answer 版本引用完整'))
        
        # 检查 Submission 引用的试卷版本是否存在
        orphaned_submissions = 0
        for submission in Submission.objects.filter(
            quiz_resource_uuid__isnull=False,
            quiz_version_number__isnull=False
        ).iterator():
            exists = Quiz.objects.filter(
                resource_uuid=submission.quiz_resource_uuid,
                version_number=submission.quiz_version_number
            ).exists()
            if not exists:
                orphaned_submissions += 1
                if orphaned_submissions <= 5:  # 只显示前5个
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Submission {submission.id} 引用的试卷版本不存在: '
                            f'{submission.quiz_resource_uuid} v{submission.quiz_version_number}'
                        )
                    )
        
        if orphaned_submissions > 0:
            self.stdout.write(
                self.style.ERROR(
                    f'✗ 发现 {orphaned_submissions} 个 Submission 引用的试卷版本不存在'
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('✓ Submission 版本引用完整'))
    
    @transaction.atomic
    def fix_answer_versions(self):
        """修复 Answer 的版本数据"""
        fixed_count = 0
        error_count = 0
        
        answers = Answer.objects.filter(
            question_resource_uuid__isnull=True
        ).select_related('question')
        
        total = answers.count()
        self.stdout.write(f'需要修复的 Answer 数量: {total}')
        
        for answer in answers.iterator():
            try:
                if answer.question:
                    answer.question_resource_uuid = answer.question.resource_uuid
                    answer.question_version_number = answer.question.version_number
                    answer.save(update_fields=[
                        'question_resource_uuid',
                        'question_version_number'
                    ])
                    fixed_count += 1
                    
                    if fixed_count % 100 == 0:
                        self.stdout.write(f'  已修复 {fixed_count}/{total}')
                else:
                    error_count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Answer {answer.id} 的 question 不存在，跳过'
                        )
                    )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'  修复 Answer {answer.id} 失败: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ 修复完成: 成功 {fixed_count}, 失败 {error_count}'
            )
        )
    
    @transaction.atomic
    def fix_submission_versions(self):
        """修复 Submission 的版本数据"""
        fixed_count = 0
        error_count = 0
        
        submissions = Submission.objects.filter(
            quiz_resource_uuid__isnull=True
        ).select_related('quiz')
        
        total = submissions.count()
        self.stdout.write(f'需要修复的 Submission 数量: {total}')
        
        for submission in submissions.iterator():
            try:
                if submission.quiz:
                    submission.quiz_resource_uuid = submission.quiz.resource_uuid
                    submission.quiz_version_number = submission.quiz.version_number
                    submission.save(update_fields=[
                        'quiz_resource_uuid',
                        'quiz_version_number'
                    ])
                    fixed_count += 1
                    
                    if fixed_count % 100 == 0:
                        self.stdout.write(f'  已修复 {fixed_count}/{total}')
                else:
                    error_count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Submission {submission.id} 的 quiz 不存在，跳过'
                        )
                    )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'  修复 Submission {submission.id} 失败: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ 修复完成: 成功 {fixed_count}, 失败 {error_count}'
            )
        )
