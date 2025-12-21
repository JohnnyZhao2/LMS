import uuid

from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def populate_quiz_version_fields(apps, schema_editor):
    Quiz = apps.get_model('quizzes', 'Quiz')
    db_alias = schema_editor.connection.alias

    for quiz in Quiz.objects.using(db_alias).all().iterator():
        if not quiz.resource_uuid:
            quiz.resource_uuid = uuid.uuid4()
        quiz.version_number = quiz.version_number or 1
        quiz.source_version_id = None
        if quiz.status == 'PUBLISHED' and not quiz.is_deleted:
            quiz.is_current = True
            if not quiz.published_at:
                quiz.published_at = quiz.updated_at or quiz.created_at or timezone.now()
        else:
            quiz.is_current = False
            quiz.published_at = None
        quiz.save(
            update_fields=[
                'resource_uuid',
                'version_number',
                'source_version',
                'is_current',
                'published_at',
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ('quizzes', '0001_quiz_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='status',
            field=models.CharField(choices=[('DRAFT', '草稿'), ('PUBLISHED', '已发布')], default='PUBLISHED', max_length=20, verbose_name='发布状态'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='resource_uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='资源标识'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='version_number',
            field=models.PositiveIntegerField(default=1, verbose_name='版本号'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='source_version',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quiz_versions', to='quizzes.quiz', verbose_name='来源版本'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='发布时间'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='is_current',
            field=models.BooleanField(default=True, verbose_name='是否当前版本'),
        ),
        migrations.RunPython(populate_quiz_version_fields, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='quiz',
            constraint=models.UniqueConstraint(fields=('resource_uuid', 'version_number'), name='uniq_quiz_resource_version'),
        ),
    ]

