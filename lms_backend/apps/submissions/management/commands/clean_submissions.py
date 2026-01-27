"""
清理答题记录的管理命令
"""
from django.core.management.base import BaseCommand

from apps.submissions.models import Answer, Submission


class Command(BaseCommand):
    help = '清理答题记录和答案数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='删除所有答题记录（包括已提交的）',
        )
        parser.add_argument(
            '--in-progress-only',
            action='store_true',
            help='仅删除进行中的答题记录',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='确认删除（必须提供此参数才会真正删除）',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                '请使用 --confirm 参数确认删除操作'
            ))
            return

        if options['all']:
            # 删除所有
            answer_count = Answer.objects.count()
            submission_count = Submission.objects.count()
            
            Answer.objects.all().delete()
            Submission.objects.all().delete()
            
            self.stdout.write(self.style.SUCCESS(
                f'已删除 {submission_count} 条答题记录和 {answer_count} 条答案记录'
            ))
        elif options['in_progress_only']:
            # 仅删除进行中的
            submissions = Submission.objects.filter(status='IN_PROGRESS')
            submission_count = submissions.count()
            answer_count = Answer.objects.filter(submission__in=submissions).count()
            
            submissions.delete()  # 级联删除 Answer
            
            self.stdout.write(self.style.SUCCESS(
                f'已删除 {submission_count} 条进行中的答题记录和 {answer_count} 条答案记录'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                '请指定 --all 或 --in-progress-only'
            ))
