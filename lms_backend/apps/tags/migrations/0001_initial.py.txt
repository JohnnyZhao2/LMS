from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('knowledge', '0012_tag_color'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name='Tag',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                        ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                        ('name', models.CharField(max_length=100, verbose_name='标签名称')),
                        ('color', models.CharField(default='#4A90E2', max_length=7, verbose_name='主题色')),
                        ('tag_type', models.CharField(choices=[('LINE', '条线类型'), ('TAG', '知识标签')], max_length=20, verbose_name='标签类型')),
                        ('sort_order', models.IntegerField(default=0, verbose_name='排序序号')),
                        ('is_active', models.BooleanField(default=True, verbose_name='是否启用')),
                    ],
                    options={
                        'verbose_name': '标签',
                        'verbose_name_plural': '标签',
                        'db_table': 'lms_tag',
                        'ordering': ['tag_type', 'sort_order', 'name'],
                        'unique_together': {('name', 'tag_type')},
                    },
                ),
            ],
        ),
    ]

