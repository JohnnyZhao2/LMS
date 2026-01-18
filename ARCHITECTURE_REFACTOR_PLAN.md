# LMS后端架构重构计划（Django单栈 / 前端契约保持）

## 项目信息
- **项目名称**: LMS (Learning Management System)
- **当前技术栈**: Django 4.2 + DRF + MySQL
- **重构目标**: Clean Architecture + 领域驱动设计
- **计划日期**: 2026-01-18
- **预计周期**: 5周

## 一、重构目标

### 核心目标
1. **规则集中**: 业务规则从views/serializers/models集中到domain和application层
2. **依赖单向**: presentation → application → domain,消除循环依赖
3. **易于测试**: domain/application可纯单元测试,无需数据库
4. **权限统一**: 权限逻辑集中到identity领域,消除重复
5. **API标准化**: 统一响应格式、异常处理、分页
6. **内部结构重构**: 不保留旧内部模块/层级,以新结构为准
7. **对外契约保持**: 现有前端依赖的接口路径/字段/语义保持一致

### 非目标
- ❌ 不改变数据库(保持MySQL)
- ❌ 不微服务化(保持单体应用)
- ❌ 不更换Web框架/ORM/迁移体系
- ❌ 不引入额外基础设施(如Redis/Celery)
- ❌ 不引入过度复杂的技术(如Event Sourcing)

## 二、目标架构

### 2.1 目录结构

```
lms_backend/
├── config/                          # 配置
│   ├── settings/
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── shared/                          # 共享层
│   ├── domain/                      # 领域层共享
│   │   ├── entity.py               # 实体基类
│   │   ├── value_object.py         # 值对象基类
│   │   ├── errors.py               # 领域错误
│   │   ├── events.py               # 领域事件基类
│   │   └── result.py               # Result类型
│   │
│   ├── application/                 # 应用层共享
│   │   ├── command.py              # 命令基类
│   │   ├── query.py                # 查询基类
│   │   ├── handler.py              # 处理器基类
│   │   ├── uow.py                  # 工作单元接口
│   │   └── interfaces.py           # 通用接口
│   │
│   ├── infrastructure/              # 基础设施共享
│   │   ├── orm/
│   │   │   ├── base_model.py      # ORM基类
│   │   │   ├── base_repository.py # 仓储基类
│   │   │   └── session.py         # 数据库会话
│   │   ├── cache/
│   │   │   └── memory_cache.py    # 内存缓存
│   │   └── messaging/
│   │       └── event_bus.py       # 事件总线(内存实现)
│   │
│   └── presentation/                # 表现层共享
│       └── rest/
│           ├── responses.py        # 统一响应
│           ├── exception_handler.py # 异常处理
│           └── pagination.py       # 分页
│
├── apps/                            # 业务领域
│   ├── identity/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   │   └── orm/
│   │   ├── presentation/
│   │   │   └── rest/
│   │   ├── models.py               # from .infrastructure.orm.models import *
│   │   └── urls.py                 # include presentation/rest/urls
│   ├── content/
│   ├── assessment/
│   ├── learning/
│   ├── observation/
│   └── analytics/
│
├── tests/
│   ├── unit/                       # domain层单测
│   ├── integration/                # application层集成
│   └── e2e/                        # API端到端
│
├── scripts/
├── manage.py
├── pytest.ini
└── README.md
```

### 2.2 领域划分

| 领域 | 职责 | 核心实体 | 当前对应 |
|------|------|---------|---------|
| **identity** | 用户、角色、权限、认证 | User, Role, Permission | auth + users |
| **content** | 知识库、题库、标签 | Knowledge, Question, Tag | knowledge + questions |
| **assessment** | 试卷、提交、评分 | Quiz, Submission, Answer | quizzes + submissions + grading |
| **learning** | 任务、分配、进度 | Task, Assignment, Progress | tasks |
| **observation** | 抽查、通知 | SpotCheck, Notification | spot_checks + notifications |
| **analytics** | 统计、报表 | Dashboard, Report | dashboard |

### 2.3 依赖规则

```
presentation → application → domain
     ↓              ↓
infrastructure ←----+
```

**严格规则**:
1. domain层不依赖Django/DRF
2. application层只依赖domain和接口定义
3. infrastructure层实现repository接口,封装Django ORM
4. presentation层仅调用application,不直连ORM
5. 跨领域通信通过application接口,不直接导入他域ORM模型

### 2.4 对外契约保持原则
1. 现有前端依赖的**路径/字段/语义/错误码**保持一致
2. 允许新增接口,不影响原有契约
3. 允许内部结构与模块完全重写

## 三、技术栈

### 3.1 保持不变
- ✅ Python 3.11+
- ✅ Django 4.2 + DRF
- ✅ MySQL 8.0
- ✅ pytest

### 3.2 依赖清单(示例)

```txt
# Web框架
django==4.2.0
djangorestframework==3.14.0
drf-spectacular==0.27.0
djangorestframework-simplejwt==5.3.1

# 认证
passlib[bcrypt]==1.7.4

# 测试
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
pytest-mock==3.12.0
factory-boy==3.3.0
```

## 四、实施计划（每域完成即测试）

### Phase 0: 契约冻结与基线 (3天)

**目标**: 锁定前端依赖契约,建立测试基线

**任务**:
1. 输出API契约清单(路径/方法/字段/错误码)
2. 建立契约回归测试(至少覆盖前端核心流程)
3. 建立shared层基础代码(错误/响应/分页)
4. 建立测试框架

**验证**:
```bash
pytest tests/e2e/  # 契约回归通过
pytest tests/unit/shared/  # shared单元测试通过
```

### Phase 1: identity领域 (5天)

**目标**: 认证授权与权限策略统一

**任务**:
1. 定义User/Role领域实体与策略
2. 实现仓储接口与ORM实现
3. 实现登录/角色切换/用户查询用例
4. 对齐现有API契约
5. 补齐单元与集成测试

**验证**:
```bash
pytest tests/unit/identity/
pytest tests/integration/identity/
pytest tests/e2e/
```

### Phase 2: content领域 (4天)

**目标**: 知识库与题库重构

**任务**:
1. 定义Knowledge/Question实体与版本策略
2. 实现仓储与ORM映射
3. 实现CRUD与查询用例
4. 对齐现有API契约
5. 测试补齐

### Phase 3: assessment领域 (5天)

**目标**: 试卷与提交管理

**任务**:
1. 定义Quiz/Submission/Answer实体
2. 实现评分逻辑与用例
3. 对齐现有API契约
4. 集成测试与回归

### Phase 4: learning领域 (5天)

**目标**: 任务与学习进度

**任务**:
1. 定义Task/Assignment/Progress实体
2. 实现任务分配与进度计算用例
3. 跨领域协作(依赖content/assessment应用接口)
4. 对齐现有API契约
5. 回归测试

### Phase 5: observation + analytics (4天)

**目标**: 抽查与统计报表

**任务**:
1. 实现SpotCheck与通知逻辑
2. 实现Dashboard查询与聚合
3. 对齐现有API契约
4. 回归测试

### Phase 6: 清理与验收 (3天)

**目标**: 清理旧结构,完成验收

**任务**:
1. 删除旧views/serializers/service冗余实现
2. 统一使用新的DRF表现层
3. 性能测试与优化
4. 文档完善与交付

## 五、关键技术决策

### 5.1 为什么继续使用Django + DRF?
1. ORM与迁移体系成熟稳定,避免双栈复杂度
2. 认证/权限/分页/序列化生态完善
3. Admin与管理命令可复用,降低运维成本
4. Clean Architecture与框架无关,可在Django内实现

### 5.2 为什么继续使用Django ORM + migrations?
1. 与现有模型和迁移完全一致,避免数据漂移
2. 事务与约束行为稳定,生产验证充分
3. 降低学习和维护成本,减少重复实现

## 六、风险与缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| API契约偏差导致前端异常 | 高 | 中 | 契约清单 + E2E回归测试 |
| 权限规则回归 | 高 | 中 | 统一策略层 + 关键权限用例测试 |
| 业务规则丢失 | 高 | 低 | 领域单元测试覆盖核心规则 |
| 性能回退 | 中 | 低 | 查询基线 + N+1检测 |
| 跨领域耦合上升 | 中 | 中 | application接口隔离 |

## 七、验收标准

### 7.1 功能验收
- [ ] 现有前端页面无需修改且流程可用
- [ ] 关键API契约回归测试通过
- [ ] 无数据丢失或损坏

### 7.2 代码质量
- [ ] 测试覆盖率 > 80%
- [ ] 无循环依赖
- [ ] 代码符合PEP 8
- [ ] 领域实体与用例有完整文档

### 7.3 性能指标
- [ ] 关键端点P95 < 200ms(基准数据集)
- [ ] 无明显N+1查询(通过统计或探针验证)
- [ ] 内存使用不显著增加

### 7.4 文档完整性
- [ ] API文档完整(OpenAPI)
- [ ] 架构文档完整
- [ ] 部署文档完整
- [ ] 开发指南完整

## 九、参考资料

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST framework Documentation](https://www.django-rest-framework.org/)
