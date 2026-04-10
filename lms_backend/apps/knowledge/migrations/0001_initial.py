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
            name='Knowledge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('resource_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='资源标识')),
                ('version_number', models.PositiveIntegerField(default=1, verbose_name='版本号')),
                ('is_current', models.BooleanField(default=True, verbose_name='是否当前版本')),
                ('title', models.CharField(max_length=200, verbose_name='标题')),
                ('content', models.TextField(blank=True, default='', verbose_name='正文内容')),
                ('view_count', models.PositiveIntegerField(default=0, verbose_name='阅读次数')),
                ('related_links', models.JSONField(blank=True, default=list, help_text='相关资料链接列表，格式为 [{"title": "文档标题", "url": "https://example.com"}]', verbose_name='相关链接')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL, verbose_name='创建者')),
                ('space_tag', models.ForeignKey(blank=True, limit_choices_to={'tag_type': 'SPACE'}, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='knowledge_by_space', to='tags.tag', verbose_name='space')),
                ('tags', models.ManyToManyField(blank=True, limit_choices_to={'tag_type': 'TAG'}, related_name='knowledge_items', to='tags.tag', verbose_name='知识标签')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='knowledge_updated', to=settings.AUTH_USER_MODEL, verbose_name='最后更新者')),
            ],
            options={
                'verbose_name': '知识文档',
                'verbose_name_plural': '知识文档',
                'db_table': 'lms_knowledge',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='knowledge',
            constraint=models.UniqueConstraint(fields=('resource_uuid', 'version_number'), name='uniq_knowledge_resource_version'),
        ),
        migrations.AddConstraint(
            model_name='knowledge',
            constraint=models.UniqueConstraint(condition=models.Q(('is_current', True)), fields=('resource_uuid',), name='uniq_knowledge_current'),
        ),
    ]
