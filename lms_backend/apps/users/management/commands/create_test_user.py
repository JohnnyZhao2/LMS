"""
Management command to create test users.
"""
from django.core.management.base import BaseCommand
from apps.users.models import User, Role, Department


class Command(BaseCommand):
    help = '创建测试用户'

    def handle(self, *args, **options):
        # 创建测试部门
        dept, _ = Department.objects.get_or_create(
            code='TEST_DEPT',
            defaults={'name': '测试部门'}
        )
        
        # 创建管理员用户
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'real_name': '系统管理员',
                'employee_id': 'ADMIN001',
                'email': 'admin@lms.com',
                'department': dept,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            # 分配所有角色
            for role in Role.objects.all():
                admin_user.assign_role(role)
            self.stdout.write(self.style.SUCCESS(f'✓ 创建管理员: {admin_user.username} (密码: admin123)'))
        else:
            self.stdout.write(f'  管理员已存在: {admin_user.username}')
        
        # 创建普通学员
        student_user, created = User.objects.get_or_create(
            username='student1',
            defaults={
                'real_name': '学员一',
                'employee_id': 'STU001',
                'email': 'student1@lms.com',
                'department': dept
            }
        )
        if created:
            student_user.set_password('student123')
            student_user.save()
            # 自动分配学员角色（在 User.create 中已处理）
            self.stdout.write(self.style.SUCCESS(f'✓ 创建学员: {student_user.username} (密码: student123)'))
        else:
            self.stdout.write(f'  学员已存在: {student_user.username}')
        
        # 创建导师
        mentor_user, created = User.objects.get_or_create(
            username='mentor1',
            defaults={
                'real_name': '导师一',
                'employee_id': 'MEN001',
                'email': 'mentor1@lms.com',
                'department': dept
            }
        )
        if created:
            mentor_user.set_password('mentor123')
            mentor_user.save()
            # 分配导师和学员角色
            mentor_role = Role.objects.get(code=Role.MENTOR)
            mentor_user.assign_role(mentor_role)
            self.stdout.write(self.style.SUCCESS(f'✓ 创建导师: {mentor_user.username} (密码: mentor123)'))
        else:
            self.stdout.write(f'  导师已存在: {mentor_user.username}')
        
        self.stdout.write(self.style.SUCCESS('\n✅ 测试用户创建完成'))
        self.stdout.write('\n可用账号:')
        self.stdout.write('  admin / admin123 (管理员)')
        self.stdout.write('  student1 / student123 (学员)')
        self.stdout.write('  mentor1 / mentor123 (导师)')
