# Generated migration to make department field required

from django.db import migrations, models
import django.db.models.deletion


def set_default_department(apps, schema_editor):
    """将所有 department 为 NULL 的用户设置为默认部门（一室）"""
    User = apps.get_model('users', 'User')
    Department = apps.get_model('users', 'Department')
    
    # 获取或创建默认部门（一室）
    default_dept, _ = Department.objects.get_or_create(
        code='DEPT1',
        defaults={
            'name': '一室',
            'description': '第一研发室'
        }
    )
    
    # 更新所有没有部门的用户
    User.objects.filter(department__isnull=True).update(department=default_dept)


def reverse_set_default_department(apps, schema_editor):
    """回滚操作：将用户的 department 设为 NULL（如果需要）"""
    # 这个操作是可选的，因为我们已经将字段改为必填
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_user_models'),
    ]

    operations = [
        # 1. 先将所有 NULL 的 department 设置为默认部门
        migrations.RunPython(set_default_department, reverse_set_default_department),
        
        # 2. 修改字段，将 null=True, blank=True 改为必填，并改为 PROTECT
        migrations.AlterField(
            model_name='user',
            name='department',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='members',
                to='users.department',
                verbose_name='所属部门'
            ),
        ),
    ]
