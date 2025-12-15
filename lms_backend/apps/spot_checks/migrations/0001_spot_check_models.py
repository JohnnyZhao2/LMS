"""
Initial migration for SpotCheck models.

Requirements: 14.1
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SpotCheck',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('content', models.TextField(verbose_name='抽查内容')),
                ('score', models.DecimalField(
                    decimal_places=2,
                    max_digits=5,
                    validators=[
                        django.core.validators.MinValueValidator(0),
                        django.core.validators.MaxValueValidator(100)
                    ],
                    verbose_name='评分'
                )),
                ('comment', models.TextField(blank=True, default='', verbose_name='评语')),
                ('checked_at', models.DateTimeField(verbose_name='抽查时间')),
                ('student', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='spot_checks_received',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='被抽查学员'
                )),
                ('checker', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='spot_checks_created',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='抽查人'
                )),
            ],
            options={
                'verbose_name': '抽查记录',
                'verbose_name_plural': '抽查记录',
                'db_table': 'lms_spot_check',
                'ordering': ['-checked_at'],
            },
        ),
    ]
