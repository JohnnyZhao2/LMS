# Generated migration for populating version data

from django.db import migrations


def populate_answer_versions(apps, schema_editor):
    """为现有 Answer 填充版本信息"""
    Answer = apps.get_model('submissions', 'Answer')
    Question = apps.get_model('questions', 'Question')
    
    # 批量处理，避免内存溢出
    batch_size = 1000
    
    # 获取需要填充的 Answer 总数
    total_count = Answer.objects.filter(
        question_resource_uuid__isnull=True
    ).count()
    
    print(f"开始填充 {total_count} 条 Answer 记录的版本信息...")
    
    processed = 0
    for offset in range(0, total_count, batch_size):
        answers = Answer.objects.filter(
            question_resource_uuid__isnull=True
        ).select_related('question')[offset:offset+batch_size]
        
        updates = []
        for answer in answers:
            try:
                question = answer.question
                answer.question_resource_uuid = question.resource_uuid
                answer.question_version_number = question.version_number
                updates.append(answer)
            except Question.DoesNotExist:
                # 题目已被删除，跳过
                continue
        
        # 批量更新
        if updates:
            Answer.objects.bulk_update(
                updates,
                ['question_resource_uuid', 'question_version_number'],
                batch_size=batch_size
            )
        
        processed += len(updates)
        print(f"已处理 {processed}/{total_count} 条记录")
    
    print(f"Answer 版本信息填充完成！")


def populate_submission_versions(apps, schema_editor):
    """为现有 Submission 填充版本信息"""
    Submission = apps.get_model('submissions', 'Submission')
    Quiz = apps.get_model('quizzes', 'Quiz')
    
    # 批量处理
    batch_size = 1000
    
    # 获取需要填充的 Submission 总数
    total_count = Submission.objects.filter(
        quiz_resource_uuid__isnull=True
    ).count()
    
    print(f"开始填充 {total_count} 条 Submission 记录的版本信息...")
    
    processed = 0
    for offset in range(0, total_count, batch_size):
        submissions = Submission.objects.filter(
            quiz_resource_uuid__isnull=True
        ).select_related('quiz')[offset:offset+batch_size]
        
        updates = []
        for submission in submissions:
            try:
                quiz = submission.quiz
                submission.quiz_resource_uuid = quiz.resource_uuid
                submission.quiz_version_number = quiz.version_number
                updates.append(submission)
            except Quiz.DoesNotExist:
                # 试卷已被删除，跳过
                continue
        
        # 批量更新
        if updates:
            Submission.objects.bulk_update(
                updates,
                ['quiz_resource_uuid', 'quiz_version_number'],
                batch_size=batch_size
            )
        
        processed += len(updates)
        print(f"已处理 {processed}/{total_count} 条记录")
    
    print(f"Submission 版本信息填充完成！")


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0002_add_version_fields'),
        ('questions', '0001_initial'),
        ('quizzes', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            populate_answer_versions,
            reverse_code=migrations.RunPython.noop
        ),
        migrations.RunPython(
            populate_submission_versions,
            reverse_code=migrations.RunPython.noop
        ),
    ]
