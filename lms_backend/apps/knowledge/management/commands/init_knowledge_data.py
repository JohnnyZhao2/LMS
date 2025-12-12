"""
Management command to initialize emergency operation manual test data.
"""
from django.core.management.base import BaseCommand
from apps.knowledge.models import KnowledgeCategory, Knowledge, OperationType
from apps.users.models import User, Department


class Command(BaseCommand):
    help = '初始化应急操作手册测试数据'
    
    def handle(self, *args, **options):
        self.stdout.write('开始初始化应急操作手册数据...')
        
        # 获取管理员用户
        try:
            admin = User.objects.get(username='admin')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('管理员用户不存在，请先创建'))
            return
        
        # 创建操作类型
        operation_types_data = [
            {'code': 'RESTART', 'name': '重启', 'description': '重启服务或系统', 'sort_order': 1},
            {'code': 'ISOLATE', 'name': '隔离', 'description': '隔离故障节点', 'sort_order': 2},
            {'code': 'STOP', 'name': '停止', 'description': '停止服务', 'sort_order': 3},
            {'code': 'ROLLBACK', 'name': '回滚', 'description': '回滚到上一版本', 'sort_order': 4},
            {'code': 'SWITCH', 'name': '切换', 'description': '切换到备用系统', 'sort_order': 5},
            {'code': 'REPAIR', 'name': '修复', 'description': '修复故障', 'sort_order': 6},
        ]
        
        operation_types = {}
        for op_data in operation_types_data:
            op_type, created = OperationType.objects.get_or_create(
                code=op_data['code'],
                defaults=op_data
            )
            operation_types[op_data['code']] = op_type
        
        self.stdout.write(self.style.SUCCESS(f'✓ 创建了 {len(operation_types_data)} 个操作类型'))
        
        # 创建一级分类（条线）
        lines_data = [
            {'code': 'CLOUD', 'name': '双云', 'description': '云平台相关', 'sort_order': 1},
            {'code': 'NETWORK', 'name': '网络', 'description': '网络相关', 'sort_order': 2},
            {'code': 'DATABASE', 'name': '数据库', 'description': '数据库相关', 'sort_order': 3},
            {'code': 'APPLICATION', 'name': '应用', 'description': '应用系统相关', 'sort_order': 4},
            {'code': 'EMERGENCY', 'name': '应急', 'description': '应急处理', 'sort_order': 5},
            {'code': 'REGULATION', 'name': '规章制度', 'description': '规章制度相关', 'sort_order': 6},
            {'code': 'OTHER', 'name': '其他', 'description': '其他类型', 'sort_order': 7},
        ]
        
        lines = {}
        for line_data in lines_data:
            line, created = KnowledgeCategory.objects.get_or_create(
                code=line_data['code'],
                level=1,
                defaults=line_data
            )
            lines[line_data['code']] = line
        
        self.stdout.write(self.style.SUCCESS(f'✓ 创建了 {len(lines_data)} 个条线（一级分类）'))
        
        # 创建二级分类（系统）
        systems_data = [
            # 双云条线下的系统
            {'code': 'CLOUD_AWS', 'name': 'AWS云平台', 'parent': lines['CLOUD'], 'sort_order': 1},
            {'code': 'CLOUD_ALIYUN', 'name': '阿里云平台', 'parent': lines['CLOUD'], 'sort_order': 2},
            # 网络条线下的系统
            {'code': 'NET_FIREWALL', 'name': '防火墙', 'parent': lines['NETWORK'], 'sort_order': 1},
            {'code': 'NET_SWITCH', 'name': '交换机', 'parent': lines['NETWORK'], 'sort_order': 2},
            {'code': 'NET_ROUTER', 'name': '路由器', 'parent': lines['NETWORK'], 'sort_order': 3},
            # 数据库条线下的系统
            {'code': 'DB_MYSQL', 'name': 'MySQL数据库', 'parent': lines['DATABASE'], 'sort_order': 1},
            {'code': 'DB_REDIS', 'name': 'Redis缓存', 'parent': lines['DATABASE'], 'sort_order': 2},
            {'code': 'DB_MONGODB', 'name': 'MongoDB数据库', 'parent': lines['DATABASE'], 'sort_order': 3},
            # 应用条线下的系统
            {'code': 'APP_WEB', 'name': 'Web应用', 'parent': lines['APPLICATION'], 'sort_order': 1},
            {'code': 'APP_API', 'name': 'API服务', 'parent': lines['APPLICATION'], 'sort_order': 2},
        ]
        
        systems = {}
        for sys_data in systems_data:
            parent = sys_data.pop('parent')
            system, created = KnowledgeCategory.objects.get_or_create(
                code=sys_data['code'],
                level=2,
                defaults={**sys_data, 'parent': parent}
            )
            systems[sys_data['code']] = system
        
        self.stdout.write(self.style.SUCCESS(f'✓ 创建了 {len(systems_data)} 个系统（二级分类）'))
        
        # 创建应急操作手册
        knowledge_list = [
            {
                'title': 'MySQL数据库主从切换应急操作',
                'summary': 'MySQL主从架构发生故障时的应急切换操作手册',
                'line': lines['DATABASE'],
                'system': systems['DB_MYSQL'],
                'content_scenario': '主库出现故障，无法提供服务，需要将从库切换为主库',
                'content_trigger': '1. 监控系统报警主库连接失败\n2. 确认主库确实无法访问\n3. 评估影响范围\n4. 决定执行主从切换',
                'content_solution': '1. 停止应用写入\n2. 确认从库数据同步完成\n3. 提升从库为主库\n4. 修改应用配置指向新主库\n5. 重启应用服务',
                'content_verification': '1. 检查新主库状态正常\n2. 验证应用可以正常读写\n3. 检查数据一致性\n4. 监控系统确认无报警',
                'content_recovery': '1. 修复原主库故障\n2. 将原主库配置为从库\n3. 启动数据同步\n4. 确认同步正常',
                'emergency_platform': '数据库管理平台',
                'operation_types_codes': ['SWITCH', 'RESTART'],
                'status': 'PUBLISHED'
            },
            {
                'title': 'Redis缓存雪崩应急处理',
                'summary': 'Redis缓存大量失效导致数据库压力过大的应急处理',
                'line': lines['DATABASE'],
                'system': systems['DB_REDIS'],
                'content_scenario': 'Redis缓存大量key同时失效，导致请求直接打到数据库，数据库压力剧增',
                'content_trigger': '1. 监控发现数据库QPS突增\n2. Redis命中率急剧下降\n3. 应用响应时间变长\n4. 启动应急响应',
                'content_solution': '1. 启用降级策略，限制部分非核心功能\n2. 增加Redis实例资源\n3. 调整缓存过期时间，避免集中失效\n4. 启用熔断机制保护数据库',
                'content_verification': '1. 数据库QPS恢复正常\n2. Redis命中率回升\n3. 应用响应时间恢复\n4. 用户访问正常',
                'content_recovery': '1. 分析缓存失效原因\n2. 优化缓存策略\n3. 逐步恢复降级功能\n4. 加强监控预警',
                'emergency_platform': '缓存管理平台',
                'operation_types_codes': ['RESTART', 'REPAIR'],
                'status': 'PUBLISHED'
            },
            {
                'title': 'Web应用服务器宕机应急处理',
                'summary': 'Web应用服务器宕机时的应急处理流程',
                'line': lines['APPLICATION'],
                'system': systems['APP_WEB'],
                'content_scenario': 'Web应用服务器突然宕机，用户无法访问系统',
                'content_trigger': '1. 监控系统报警服务器无响应\n2. 用户反馈无法访问\n3. 健康检查失败\n4. 启动应急流程',
                'content_solution': '1. 从负载均衡中摘除故障节点\n2. 检查其他节点状态\n3. 如需要，启动备用节点\n4. 重启故障节点或切换到备用节点',
                'content_verification': '1. 负载均衡显示所有节点健康\n2. 用户可以正常访问\n3. 应用日志无异常\n4. 监控指标恢复正常',
                'content_recovery': '1. 分析宕机原因\n2. 修复故障节点\n3. 将节点重新加入负载均衡\n4. 观察运行状态',
                'emergency_platform': '应用管理平台',
                'operation_types_codes': ['ISOLATE', 'RESTART', 'SWITCH'],
                'status': 'PUBLISHED'
            },
            {
                'title': '防火墙规则异常应急处理（草稿）',
                'summary': '防火墙规则配置错误导致网络不通的应急处理',
                'line': lines['NETWORK'],
                'system': systems['NET_FIREWALL'],
                'content_scenario': '防火墙规则配置错误，导致关键业务网络不通',
                'content_trigger': '待完善...',
                'content_solution': '待完善...',
                'content_verification': '待完善...',
                'content_recovery': '待完善...',
                'emergency_platform': '网络管理平台',
                'operation_types_codes': ['ROLLBACK', 'REPAIR'],
                'status': 'DRAFT'
            }
        ]
        
        created_count = 0
        for item in knowledge_list:
            operation_types_codes = item.pop('operation_types_codes', [])
            
            # 检查是否已存在
            if not Knowledge.objects.filter(title=item['title']).exists():
                knowledge = Knowledge.objects.create(
                    creator=admin,
                    **item
                )
                
                # 添加操作类型
                for code in operation_types_codes:
                    if code in operation_types:
                        knowledge.operation_types.add(operation_types[code])
                
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ 创建了 {created_count} 篇应急操作手册'))
        self.stdout.write(self.style.SUCCESS('应急操作手册数据初始化完成！'))
