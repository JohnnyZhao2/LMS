from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('is_deleted', models.BooleanField(default=False, verbose_name='是否删除')),
                ('deleted_at', models.DateTimeField(blank=True, null=True, verbose_name='删除时间')),
                ('resource_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='资源标识')),
                ('version_number', models.PositiveIntegerField(default=1, verbose_name='版本号')),
                ('is_current', models.BooleanField(default=True, verbose_name='是否当前版本')),
                ('content', models.TextField(verbose_name='题目内容')),
                ('question_type', models.CharField(choices=[('SINGLE_CHOICE', '单选题'), ('MULTIPLE_CHOICE', '多选题'), ('TRUE_FALSE', '判断题'), ('SHORT_ANSWER', '简答题')], max_length=20, verbose_name='题目类型')),
                ('options', models.JSONField(blank=True, default=list, verbose_name='选项')),
                ('answer', models.JSONField(verbose_name='答案')),
                ('explanation', models.TextField(blank=True, default='', verbose_name='解析')),
                ('score', models.DecimalField(decimal_places=2, default=1.0, max_digits=5, verbose_name='分值')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL, verbose_name='创建者')),
                ('space_tag', models.ForeignKey(blank=True, limit_choices_to={'tag_type': 'SPACE'}, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='question_by_space', to='tags.tag', verbose_name='space')),
                ('tags', models.ManyToManyField(blank=True, limit_choices_to={'tag_type': 'TAG'}, related_name='question_items', to='tags.tag', verbose_name='题目标签')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='question_updated', to=settings.AUTH_USER_MODEL, verbose_name='最后更新者')),
            ],
            options={
                'verbose_name': '题目',
                'verbose_name_plural': '题目',
                'db_table': 'lms_question',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='question',
            constraint=models.UniqueConstraint(fields=('resource_uuid', 'version_number'), name='uniq_question_resource_version'),
        ),
        migrations.AddConstraint(
            model_name='question',
            constraint=models.UniqueConstraint(condition=models.Q(('is_current', True)), fields=('resource_uuid',), name='uniq_question_current'),
        ),
    ]
