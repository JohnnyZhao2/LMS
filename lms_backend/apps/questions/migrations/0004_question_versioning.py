import uuid

from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def populate_question_version_fields(apps, schema_editor):
    Question = apps.get_model('questions', 'Question')
    db_alias = schema_editor.connection.alias

    for question in Question.objects.using(db_alias).all().iterator():
        if not question.resource_uuid:
            question.resource_uuid = uuid.uuid4()
        question.version_number = question.version_number or 1
        question.source_version_id = None
        if question.status == 'PUBLISHED' and not question.is_deleted:
            question.is_current = True
            if not question.published_at:
                question.published_at = question.updated_at or question.created_at or timezone.now()
        else:
            question.is_current = False
            question.published_at = None
        question.save(
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
        ('questions', '0003_remove_question_tags_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='status',
            field=models.CharField(choices=[('DRAFT', '草稿'), ('PUBLISHED', '已发布')], default='PUBLISHED', max_length=20, verbose_name='发布状态'),
        ),
        migrations.AddField(
            model_name='question',
            name='resource_uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='资源标识'),
        ),
        migrations.AddField(
            model_name='question',
            name='version_number',
            field=models.PositiveIntegerField(default=1, verbose_name='版本号'),
        ),
        migrations.AddField(
            model_name='question',
            name='source_version',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='question_versions', to='questions.question', verbose_name='来源版本'),
        ),
        migrations.AddField(
            model_name='question',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='发布时间'),
        ),
        migrations.AddField(
            model_name='question',
            name='is_current',
            field=models.BooleanField(default=True, verbose_name='是否当前版本'),
        ),
        migrations.RunPython(populate_question_version_fields, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='question',
            constraint=models.UniqueConstraint(fields=('resource_uuid', 'version_number'), name='uniq_question_resource_version'),
        ),
    ]

