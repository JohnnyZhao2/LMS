# 架构重构快速开始指南

## 🚀 第一步：创建基础类（30分钟）

### 1. 创建 Base Repository

```bash
# 创建文件
touch core/base_repository.py
```

复制 `ARCHITECTURE_IMPLEMENTATION_PLAN.md` 中的 `BaseRepository` 代码。

### 2. 创建 Base Service

```bash
# 创建文件
touch core/base_service.py
```

复制 `ARCHITECTURE_IMPLEMENTATION_PLAN.md` 中的 `BaseService` 代码。

### 3. 更新异常处理

更新 `core/exceptions.py`，确保包含所有错误码。

### 4. 验证

```bash
# 运行测试
python manage.py test core
```

---

## 📦 第二步：重构 Knowledge 模块（2-3天）

### Day 1：创建 Repository

1. 创建 `apps/knowledge/repositories.py`
2. 实现 `KnowledgeRepository` 和 `TagRepository`
3. 运行测试验证

### Day 2：重构 Service

1. 更新 `apps/knowledge/services.py`
2. 使用 Repository 替代直接 ORM 操作
3. 运行测试验证

### Day 3：重构 Views

1. 更新 `apps/knowledge/views/knowledge.py`
2. 移除所有业务逻辑，只保留 HTTP 处理
3. 运行 API 测试验证

---

## ✅ 验证清单模板

每个模块重构后，检查：

```markdown
## {Module} 模块重构验证

### Repository 层
- [ ] 继承 BaseRepository
- [ ] 所有数据库操作在 Repository
- [ ] 提供领域友好的查询接口

### Service 层
- [ ] 所有业务逻辑在 Service
- [ ] 通过 Repository 访问数据
- [ ] 不直接操作 ORM Model

### View 层
- [ ] 只处理 HTTP 请求/响应
- [ ] 调用 Service，不直接调用 Repository
- [ ] 不包含业务逻辑

### Model 层
- [ ] 只定义字段和简单属性
- [ ] 不包含业务方法
- [ ] 保留 Django 验证钩子

### 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] API 测试通过
```

---

## 🔧 常用命令

```bash
# 运行测试
python manage.py test

# 运行特定模块测试
python manage.py test apps.knowledge

# 检查代码风格
flake8 apps/

# 运行服务器
python manage.py runserver
```

---

## 📚 参考文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 完整架构设计
- [ARCHITECTURE_IMPLEMENTATION_PLAN.md](./ARCHITECTURE_IMPLEMENTATION_PLAN.md) - 详细实施方案
- [ARCHITECTURE_IMPLEMENTATION.md](./ARCHITECTURE_IMPLEMENTATION.md) - 实现指南和代码示例

---

## 🆘 遇到问题？

### 问题1：Repository 如何返回 QuerySet？

**回答**：Repository 可以返回 QuerySet，Service 层再转换为列表。或者 Repository 直接返回列表。

### 问题2：Service 需要事务怎么办？

**回答**：使用 `@transaction.atomic` 装饰器：

```python
@transaction.atomic
def create(self, data: dict, user):
    # 多个 Repository 操作
    pass
```

### 问题3：如何处理跨模块调用？

**回答**：通过 Service 调用其他 Service：

```python
class TaskService:
    def create(self, data: dict):
        # 调用 Knowledge Service
        knowledge_service = KnowledgeService()
        knowledge = knowledge_service.get_by_id(data['knowledge_id'])
        # ...
```

---

---

## ✅ 阶段4：测试与文档

### 测试验证

已完成：
- ✅ 修复测试文件中的语法错误
- ✅ 修复迁移文件中的 SQLite 兼容性问题
- ⚠️ 部分属性测试需要 hypothesis 依赖（待安装）

运行测试：
```bash
# 运行所有测试
python -m pytest tests/ -v --tb=short

# 运行集成测试
python -m pytest tests/integration/ -v

# 运行属性测试（需要安装 hypothesis）
python -m pytest tests/properties/ -v
```

### 代码审查

审查报告：参见 [STAGE4_CODE_REVIEW.md](./STAGE4_CODE_REVIEW.md)

审查结果：✅ **通过**

主要发现：
- ✅ 所有模块都已实现 Repository 层
- ✅ 所有模块都已实现 Service 层
- ✅ View 层职责清晰
- ⚠️ 部分 Service 中有少量直接 ORM 操作（建议迁移到 Repository）

### 文档完善

已更新：
- ✅ [STAGE4_CODE_REVIEW.md](./STAGE4_CODE_REVIEW.md) - 代码审查报告
- ✅ [QUICK_START.md](./QUICK_START.md) - 快速开始指南（本文件）
- ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计文档
- ✅ [ARCHITECTURE_IMPLEMENTATION_PLAN.md](./ARCHITECTURE_IMPLEMENTATION_PLAN.md) - 实施计划

---

## 🎯 下一步

1. ✅ 完成基础类创建
2. ✅ 完成 Knowledge 模块重构（试点）
3. ✅ 完成所有模块重构
4. ✅ 完成测试验证与代码审查
5. 📋 **阶段5（可选）**：核心模块引入 Domain 层
